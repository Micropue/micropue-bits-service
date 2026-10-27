// 修改管理员：名称、状态、高级权限
// 禁用 / 授予或撤销高级权限需要：操作者本身有高级权限 + 10 分钟内的网关码验证
export default defineEventHandler(async event => {
  const self = await requireAdmin(event)
  assertAdvancedPermission(self)
  await enforceUserRateLimit(event, self.uuid, 'admin:admins:update', 20, 3600)
  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const target = await fetchAdminByUuid(uuid)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Administrator not found' })

  const body = await readBody<{ name?: string; status?: string; advanced?: unknown }>(event)
  const wantsAdvancedChange = body?.advanced !== undefined
  const next = {
    name: body?.name === undefined ? target.name : String(body.name).trim().slice(0, 64),
    status: body?.status === undefined ? target.status : String(body.status),
    advanced: wantsAdvancedChange ? body.advanced === true : target.advanced
  }

  if (next.status !== 'normal' && next.status !== 'disabled') {
    throw createError({ statusCode: 400, statusMessage: 'Unknown status', data: { field: 'status' } })
  }
  if (uuid === self.uuid && next.status === 'disabled') {
    throw createError({ statusCode: 409, statusMessage: 'You cannot disable your own account' })
  }
  if (wantsAdvancedChange && uuid === self.uuid) {
    throw createError({ statusCode: 409, statusMessage: 'You cannot change your own advanced permission' })
  }

  const disabling = target.status === 'normal' && next.status === 'disabled'
  const demoting = target.advanced && !next.advanced
  if (wantsAdvancedChange || disabling) await assertAdvancedAccess(self)

  if (next.status === 'disabled') await assertNotLastAdmin(target)
  if (disabling || demoting) await assertNotLastAdvancedAdmin(target)

  await useDb().execute(
    'UPDATE `admins` SET `name` = ?, `status` = ?, `permissions` = ? WHERE `uuid` = ?',
    [next.name, next.status, JSON.stringify(next.advanced ? ['advanced'] : []), uuid]
  )

  // 禁用后立即失效该管理员的全部会话
  if (next.status === 'disabled') {
    await useDb().execute('DELETE FROM `admin_sessions` WHERE `admin_uuid` = ?', [uuid])
  }
  if (disabling || demoting) await clearAdvancedGrant(uuid)

  return { admin: publicAdminOrNull(await fetchAdminByUuid(uuid)) }
})
