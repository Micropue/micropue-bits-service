// 第一步：管理员输入邮箱 → 第二步服务端判断是否在管理员列表中（不对外暴露结果）→ 第三步发 64 位动态码
export default defineEventHandler(async event => {
  const methods = await getAuthMethods()
  if (!methods.email) {
    throw createError({ statusCode: 403, statusMessage: 'Dynamic email code sign-in is disabled' })
  }
  const body = await readBody<{ email?: string }>(event)
  return issueAdminCode(event, body?.email)
})
