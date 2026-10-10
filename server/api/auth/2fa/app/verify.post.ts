// 两步验证 - AuthApp 动态码校验
export default defineEventHandler(async event => {
  const body = await readBody<{ ticket?: string; code?: string }>(event)
  const ticket = String(body?.ticket ?? '')
  const code = String(body?.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter the 6-digit code' })
  }

  const user = await resolveTwoFaTicket(ticket)
  if (!user.totp_secret) {
    throw createError({ statusCode: 400, statusMessage: 'Authenticator app is not set up' })
  }

  const redis = useRedis()
  const last = await redis.get(AUTH_KEYS.totpStep(user.uuid))
  const result = await verifyTotp(decryptSecret(user.totp_secret), code, last ? Number(last) : undefined)
  if (!result.valid) {
    return registerTwoFactorFailure(ticket)
  }

  await redis.set(AUTH_KEYS.totpStep(user.uuid), String(result.timeStep), 'EX', 86400)
  await completeTwoFactor(event, ticket, user)
  return { email: user.email }
})
