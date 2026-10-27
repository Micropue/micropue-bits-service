import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

// 高级权限验证：Passkey 第二步，校验断言后授权 10 分钟
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  if (!admin.advanced) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Advanced permission is required for this action',
      data: { code: 'ADVANCED_REQUIRED' }
    })
  }

  await enforceIpRateLimit(event, 'console:advanced-passkey-verify', 30, 600)
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced:passkey', 20, 3600)

  const body = await readBody<{ response?: AuthenticationResponseJSON }>(event)
  const response = body?.response
  const credentialId = response?.id
  const failed = createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  if (!response || !credentialId) throw failed

  const redis = useRedis()
  const key = AUTH_KEYS.consoleAdvancedWebauthn(admin.uuid)
  const expectedChallenge = await redis.get(key)
  if (!expectedChallenge) {
    throw createError({ statusCode: 410, statusMessage: 'Verification session expired' })
  }

  const stored = admin.passkeys.find(passkey => passkey.id === credentialId)
  if (!stored) throw failed

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
    console.error('[console] 高级权限 Passkey 校验失败：', err)
    throw failed
  }
  if (!verification.verified) throw failed

  await redis.del(key)
  stored.counter = verification.authenticationInfo.newCounter
  await saveAdminPasskeys(admin.uuid, admin.passkeys)
  return grantAdvancedAccess(admin.uuid)
})
