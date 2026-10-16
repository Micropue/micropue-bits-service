// 修改管理员：名称、权限点、状态（禁用自己会把当前登录踢出，禁止）
export default defineEventHandler(async event => {
  const self = await requireAdmin(event, 'admins.manage')
  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const target = await fetchAdminByUuid(uuid)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Administrator not found' })

  const body = await readBody<{ name?: string; permissions?: unknown; status?: string }>(event)
  const next = {
    name: body?.name === undefined ? target.name : String(body.name).trim().slice(0, 64),
    permissions: Array.isArray(body?.permissions) ? body.permissions.filter(isValidAdminPermission) : target.permissions,
    status: body?.status === undefined ? target.status : String(body.status)
  }

  if (next.status !== 'normal' && next.status !== 'disabled') {
    throw createError({ statusCode: 400, statusMessage: 'Unknown status', data: { field: 'status' } })
  }
  if (uuid === self.uuid && next.status === 'disabled') {
    throw createError({ statusCode: 409, statusMessage: 'You cannot disable your own account' })
  }
  if (next.status === 'disabled') await assertNotLastAdmin(target)

  await useDb().execute(
    'UPDATE `admins` SET `name` = ?, `permissions` = ?, `status` = ? WHERE `uuid` = ?',
    [next.name, JSON.stringify(next.permissions), next.status, uuid]
  )

  // 禁用后立即失效该管理员的全部会话
  if (next.status === 'disabled') {
    await useDb().execute('DELETE FROM `admin_sessions` WHERE `admin_uuid` = ?', [uuid])
  }

  return { admin: publicAdminOrNull(await fetchAdminByUuid(uuid)) }
})
