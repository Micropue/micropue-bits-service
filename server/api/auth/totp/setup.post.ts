// 开始绑定 AuthApp：需登录 + 当前密码校验；返回密钥 / otpauth URI / 二维码（明文密钥仅此返回一次，激活前存 Redis）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string }>(event)
  await assertPasswordConfirm(user, body?.password)

  if (user.totp_secret) {
    throw createError({ statusCode: 409, statusMessage: 'Authenticator app is already set up', data: { field: 'totp' } })
  }

  const secret = newTotpSecret()
  await useRedis().set(AUTH_KEYS.totpSetup(user.uuid), secret, 'EX', 300)

  const account = user.username || user.email
  const otpauthUri = totpUri(account, secret)
  const qrDataUrl = await totpQrDataUrl(otpauthUri)

  return { secret, otpauthUri, qrDataUrl, issuer: totpIssuer(), account }
})
