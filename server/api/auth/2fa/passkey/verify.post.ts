import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

// 两步验证 - 完成 Passkey 校验
export default defineEventHandler(async event => {
  const body = await readBody<{ ticket?: string; challengeId?: string; response?: AuthenticationResponseJSON }>(event)
  const ticket = String(body?.ticket ?? '')
  const challengeId = String(body?.challengeId ?? '')
  const response = body?.response
  const credentialId = response?.id
  if (!challengeId || !response || !credentialId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid passkey response' })
  }

  const redis = useRedis()
  const expectedChallenge = await redis.get(AUTH_KEYS.webauthnAuth(challengeId))
  if (!expectedChallenge) {
    throw createError({ statusCode: 410, statusMessage: 'Verification session expired' })
  }

  const user = await resolveTwoFaTicket(ticket)
  const passkeys = normalizePasskeys(user.passkeys)
  const stored = passkeys.find(p => p.id === credentialId)
  if (!stored) {
    throw createError({ statusCode: 400, statusMessage: 'Passkey not recognized' })
  }

  const { rpID, origin } = rpConfig(event)
  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.id,
        publicKey: Buffer.from(stored.publicKey, 'base64url'),
        counter: stored.counter,
        transports: (stored.transports ?? []) as never
      },
      requireUserVerification: false
    })
  } catch (err) {
    console.error('[2fa] Passkey 校验失败：', err)
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }
  if (!verification.verified) {
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }

  await redis.del(AUTH_KEYS.webauthnAuth(challengeId))
  stored.counter = verification.authenticationInfo.newCounter
  await savePasskeys(user.uuid, passkeys)

  await completeTwoFactor(event, ticket, user)
  return { email: user.email }
})
