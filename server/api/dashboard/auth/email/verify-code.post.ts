// 校验 64 位动态认证码；通过即签发控制台会话（JWT Cookie + admin_sessions 落库）
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'console:email-verify', 30, 3600)
  const methods = await getAuthMethods()
  if (!methods.email) {
    throw createError({ statusCode: 403, statusMessage: 'Dynamic email code sign-in is disabled' })
  }
  const body = await readBody<{ email?: string; code?: string }>(event)
  const admin = await verifyAdminCode(event, body?.email, body?.code)
  return { admin: publicAdmin(admin) }
})
