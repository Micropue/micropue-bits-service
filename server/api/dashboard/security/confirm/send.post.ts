// 身份确认第一步：向当前管理员邮箱发送 64 位动态码（复用登录发码的风控与限流）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  return issueAdminCode(event, admin.email)
})
