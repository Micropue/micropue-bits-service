// 激活 AuthApp：用待激活密钥校验动态码，通过则加密写库
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceIpRateLimit(event, 'auth:totp-activate', 30, 3600)
  const body = await readBody<{ code?: string }>(event)
  const code = String(body?.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter the 6-digit code' })
  }

  const redis = useRedis()
  const secret = await redis.get(AUTH_KEYS.totpSetup(user.uuid))
  if (!secret) {
    throw createError({ statusCode: 410, statusMessage: 'Setup session expired' })
  }

  const result = await verifyTotp(secret, code)
  if (!result.valid) {
    const failKey = AUTH_KEYS.totpSetupFail(user.uuid)
    const failures = await redis.incr(failKey)
    if (failures === 1) await redis.expire(failKey, 300)
    if (failures >= 5) {
      await redis.del(failKey)
      await redis.del(AUTH_KEYS.totpSetup(user.uuid))
      throw createError({ statusCode: 410, statusMessage: 'Too many incorrect codes, please start setup again' })
    }
    throw createError({ statusCode: 400, statusMessage: 'Incorrect code', data: { field: 'code' } })
  }

  await useDb().execute('UPDATE `users` SET `totp_secret` = ? WHERE `uuid` = ?', [encryptSecret(secret), user.uuid])
  await redis.del(AUTH_KEYS.totpSetup(user.uuid))
  await redis.del(AUTH_KEYS.totpSetupFail(user.uuid))
  return { ok: true }
})
