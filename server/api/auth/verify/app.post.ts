// 敏感操作二次验证：AuthApp 动态码通过后发放授权标记
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceIpRateLimit(event, 'auth:verify-app', 30, 3600)
  const body = await readBody<{ code?: string }>(event)
  const code = String(body?.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter the 6-digit code' })
  }
  if (!user.totp_secret) {
    throw createError({ statusCode: 400, statusMessage: 'Authenticator app is not set up' })
  }

  await assertTotpNotLocked(user.uuid)
  const redis = useRedis()
  const last = await redis.get(AUTH_KEYS.totpStep(user.uuid))
  const result = await verifyTotp(decryptSecret(user.totp_secret), code, last ? Number(last) : undefined)
  if (!result.valid) {
    await registerTotpFailure(event, user.uuid)
    throw createError({ statusCode: 403, statusMessage: 'Incorrect code', data: { field: 'code' } })
  }

  // 防重放：记录已用时间步
  await redis.set(AUTH_KEYS.totpStep(user.uuid), String(result.timeStep), 'EX', 86400)
  await clearTotpFailure(user.uuid)
  await grantSensitiveVerify(user.uuid)
  return { ok: true, method: 'app' }
})
