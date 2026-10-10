import { generateRegistrationOptions } from '@simplewebauthn/server'

// 开始注册 Passkey：需登录 + 当前密码校验；返回 WebAuthn 注册选项
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string }>(event)
  // 敏感操作身份校验（无密码账户 → 409 NO_PASSWORD）
  await assertPasswordConfirm(user, body?.password)

  const passkeys = normalizePasskeys(user.passkeys)
  if (passkeys.length >= MAX_PASSKEYS) {
    throw createError({
      statusCode: 409,
      statusMessage: `You can bind up to ${MAX_PASSKEYS} passkeys`,
      data: { field: 'passkey' }
    })
  }

  const { rpID, rpName } = rpConfig(event)
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.uuid),
    userName: user.username || user.email,
    userDisplayName: user.nickname || user.username || user.email,
    attestationType: 'none',
    excludeCredentials: passkeys.map(p => ({ id: p.id, transports: (p.transports ?? []) as never })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred'
    }
  })

  await useRedis().set(AUTH_KEYS.webauthnReg(user.uuid), options.challenge, 'EX', 300)
  return options
})
