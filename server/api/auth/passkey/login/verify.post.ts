import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import type { RowDataPacket } from 'mysql2/promise'

// 完成 Passkey 登录：按 credentialId 定位用户 → 校验断言 → 签发会话
export default defineEventHandler(async event => {
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
    throw createError({ statusCode: 410, statusMessage: 'Authentication session expired' })
  }

  const [rows] = await useDb().query<
    (RowDataPacket & {
      uuid: string
      email: string
      status: string
      passkeys: unknown
      login_devices: unknown
    })[]
  >(
    'SELECT `uuid`, `email`, `status`, `passkeys`, `login_devices` FROM `users` WHERE JSON_CONTAINS(`passkeys`, JSON_OBJECT(\'id\', ?)) LIMIT 1',
    [credentialId]
  )
  const user = rows[0]
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Passkey not recognized' })
  }
  if (user.status !== 'normal') {
    throw createError({ statusCode: 403, statusMessage: 'This account has been disabled' })
  }

  const passkeys = normalizePasskeys(user.passkeys)
  const stored = passkeys.find(p => p.id === credentialId)
  if (!stored) {
    throw createError({ statusCode: 404, statusMessage: 'Passkey not recognized' })
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
    console.error('[passkey] 登录校验失败：', err)
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }
  if (!verification.verified) {
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }

  await redis.del(AUTH_KEYS.webauthnAuth(challengeId))

  // 更新计数器（防重放）
  stored.counter = verification.authenticationInfo.newCounter
  await savePasskeys(user.uuid, passkeys)

  await issueSession(event, { uuid: user.uuid, login_devices: user.login_devices })
  return { email: user.email }
})
