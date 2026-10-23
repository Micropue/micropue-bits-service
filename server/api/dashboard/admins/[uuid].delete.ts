// 移除管理员：不能删自己，也不能删到最后一个正常管理员
export default defineEventHandler(async event => {
  const self = await requireAdmin(event)
  await enforceUserRateLimit(event, self.uuid, 'admin:admins:delete', 20, 3600)
  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const target = await fetchAdminByUuid(uuid)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Administrator not found' })

  if (uuid === self.uuid) {
    throw createError({ statusCode: 409, statusMessage: 'You cannot remove your own account' })
  }
  if (target.status === 'normal') await assertNotLastAdmin(target)

  await useDb().execute('DELETE FROM `admins` WHERE `uuid` = ?', [uuid])
  await useDb().execute('DELETE FROM `admin_sessions` WHERE `admin_uuid` = ?', [uuid])
  return { ok: true }
})
