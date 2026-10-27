// 移除管理员：需要高级权限 + 网关码验证；不能删自己，也不能删到最后一个正常 / 高级管理员
export default defineEventHandler(async event => {
  const self = await requireAdmin(event)
  await enforceUserRateLimit(event, self.uuid, 'admin:admins:delete', 20, 3600)
  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const target = await fetchAdminByUuid(uuid)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Administrator not found' })

  if (uuid === self.uuid) {
    throw createError({ statusCode: 409, statusMessage: 'You cannot remove your own account' })
  }
  await assertAdvancedAccess(self)
  if (target.status === 'normal') await assertNotLastAdmin(target)
  await assertNotLastAdvancedAdmin(target)

  await useDb().execute('DELETE FROM `admins` WHERE `uuid` = ?', [uuid])
  await useDb().execute('DELETE FROM `admin_sessions` WHERE `admin_uuid` = ?', [uuid])
  await clearAdvancedGrant(uuid)
  return { ok: true }
})
