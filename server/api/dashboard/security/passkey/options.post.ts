import { generateRegistrationOptions } from '@simplewebauthn/server'

// 开始绑定 Passkey：返回 WebAuthn 注册选项（challenge 存 Redis）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await assertConsoleVerify(admin)

  if (admin.passkeys.length >= MAX_PASSKEYS) {
    throw createError({ statusCode: 409, statusMessage: `You can bind up to ${MAX_PASSKEYS} passkeys` })
  }

  const { rpID, rpName } = rpConfig(event)
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(admin.uuid),
    userName: admin.email,
    userDisplayName: admin.name || admin.email,
    attestationType: 'none',
    excludeCredentials: admin.passkeys.map(passkey => ({
      id: passkey.id,
      transports: (passkey.transports ?? []) as never
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred'
    }
  })

  await useRedis().set(AUTH_KEYS.consoleWebauthnReg(admin.uuid), options.challenge, 'EX', 300)
  return options
})
