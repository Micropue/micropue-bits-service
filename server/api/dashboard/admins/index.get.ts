// 管理员列表：任何已登录管理员可查看，增删改需 admins.manage 权限
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const admin = await requireAdmin(event)
  return {
    admins: (await listAdmins()).map(publicAdmin),
    canManage: admin.permissions.includes('admins.manage'),
    selfUuid: admin.uuid
  }
})
