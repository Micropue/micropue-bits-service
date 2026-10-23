// 开始绑定 AuthApp：生成密钥与二维码，明文密钥只返回这一次（激活前存 Redis）
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'console:totp-setup', 20, 3600)
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'console:totp-setup', 10, 3600)
  await assertConsoleVerify(admin)

  if (admin.totp_secret) {
    throw createError({ statusCode: 409, statusMessage: 'Authenticator app is already set up' })
  }

  const secret = newTotpSecret()
  await useRedis().set(AUTH_KEYS.consoleTotpSetup(admin.uuid), secret, 'EX', 300)

  const otpauthUri = totpUri(admin.email, secret)
  const qrDataUrl = await totpQrDataUrl(otpauthUri)

  return { secret, otpauthUri, qrDataUrl, issuer: totpIssuer(), account: admin.email }
})
