// 身份确认第二步：校验 64 位动态码，通过后授予 10 分钟绑定授权（绑定/解绑登录凭据的通行证）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceIpRateLimit(event, 'console:confirm-verify', 30, 3600)
  const body = await readBody<{ code?: string }>(event)

  const confirmed = await consumeAdminCode(admin.email, body?.code)
  if (confirmed.uuid !== admin.uuid) {
    throw createError({ statusCode: 403, statusMessage: 'Incorrect sign-in code' })
  }

  await grantConsoleVerify(admin.uuid)
  return { verified: true, expiresInSeconds: CONSOLE_GRANT_SECONDS }
})
