// 完成绑定 AuthApp：用待激活密钥校验 6 位动态码，通过后加密入库
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'console:totp-activate', 20, 3600)
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'console:totp-activate', 10, 3600)
  await assertConsoleVerify(admin)

  const body = await readBody<{ code?: string }>(event)
  const code = String(body?.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter the 6-digit code' })
  }

  const redis = useRedis()
  const secret = await redis.get(AUTH_KEYS.consoleTotpSetup(admin.uuid))
  if (!secret) {
    throw createError({ statusCode: 410, statusMessage: 'Setup session expired' })
  }

  const result = await verifyTotp(secret, code)
  if (!result.valid) {
    const failKey = AUTH_KEYS.consoleTotpSetupFail(admin.uuid)
    const failures = await redis.incr(failKey)
    if (failures === 1) await redis.expire(failKey, 300)
    if (failures >= 5) {
      await redis.del(failKey)
      await redis.del(AUTH_KEYS.consoleTotpSetup(admin.uuid))
      throw createError({ statusCode: 410, statusMessage: 'Too many incorrect codes, please start setup again' })
    }
    throw createError({ statusCode: 400, statusMessage: 'Incorrect code' })
  }

  await setAdminTotpSecret(admin.uuid, encryptSecret(secret))
  await redis.del(AUTH_KEYS.consoleTotpSetup(admin.uuid))
  await redis.del(AUTH_KEYS.consoleTotpSetupFail(admin.uuid))
  return { bound: true }
})
