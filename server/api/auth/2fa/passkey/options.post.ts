import { randomUUID } from 'node:crypto'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

// 两步验证 - 开始 Passkey 校验：按票据定位用户，allowCredentials = 其已绑定 Passkey
export default defineEventHandler(async event => {
  const body = await readBody<{ ticket?: string }>(event)
  const user = await resolveTwoFaTicket(String(body?.ticket ?? ''))
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
