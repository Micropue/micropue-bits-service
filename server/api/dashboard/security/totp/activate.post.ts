// 完成绑定 AuthApp：用待激活密钥校验 6 位动态码，通过后加密入库
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
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
    throw createError({ statusCode: 400, statusMessage: 'Incorrect code' })
  }

  await setAdminTotpSecret(admin.uuid, encryptSecret(secret))
  await redis.del(AUTH_KEYS.consoleTotpSetup(admin.uuid))
  return { bound: true }
})
