import { randomUUID } from 'node:crypto'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

// 敏感操作二次验证：Passkey 认证选项（allowCredentials = 账户已绑定 Passkey）
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'auth:verify-passkey-options', 30, 600)
  const user = await requireAuth(event)
  const passkeys = normalizePasskeys(user.passkeys)
  if (passkeys.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No passkeys available' })
  }

  const { rpID } = rpConfig(event)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: passkeys.map(p => ({ id: p.id, transports: (p.transports ?? []) as never }))
  })

  const challengeId = randomUUID()
  await useRedis().set(AUTH_KEYS.webauthnAuth(challengeId), options.challenge, 'EX', 300)
  return { options, challengeId }
})
