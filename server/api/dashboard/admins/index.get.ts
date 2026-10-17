// 管理员列表：任何已登录管理员可查看，也可增删改（登录管理员权限相同）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const admin = await requireAdmin(event)
  return {
    admins: (await listAdmins()).map(publicAdmin),
    selfUuid: admin.uuid
  }
})
