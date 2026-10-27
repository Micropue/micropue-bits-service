// 管理员列表：仅高级权限管理员可查看和操作
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const admin = await requireAdmin(event)
  assertAdvancedPermission(admin)
  return {
    admins: (await listAdmins()).map(publicAdmin),
    selfUuid: admin.uuid
  }
})
