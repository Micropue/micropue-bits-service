// 激活 AuthApp：用待激活密钥校验动态码，通过则加密写库
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
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
    throw createError({ statusCode: 400, statusMessage: 'Incorrect code', data: { field: 'code' } })
  }

  await useDb().execute('UPDATE `users` SET `totp_secret` = ? WHERE `uuid` = ?', [encryptSecret(secret), user.uuid])
  await redis.del(AUTH_KEYS.totpSetup(user.uuid))
  return { ok: true }
})
