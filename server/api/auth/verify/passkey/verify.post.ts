import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

// 敏感操作二次验证：Passkey 断言通过后发放授权标记
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'auth:verify-passkey-verify', 20, 600)
  const user = await requireAuth(event)
  const body = await readBody<{ challengeId?: string; response?: AuthenticationResponseJSON }>(event)
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
    console.error('[verify] Passkey 校验失败：', err)
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }
  if (!verification.verified) {
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }

  await redis.del(AUTH_KEYS.webauthnAuth(challengeId))
  stored.counter = verification.authenticationInfo.newCounter
  await savePasskeys(user.uuid, passkeys)

  await grantSensitiveVerify(user.uuid)
  return { ok: true, method: 'passkey' }
})
