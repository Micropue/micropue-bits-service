import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import type { RowDataPacket } from 'mysql2/promise'

// Passkey 登录第二步：按 credentialId 定位管理员 → 校验断言 → 签发控制台会话
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'console:passkey-login-verify', 20, 600)
  const body = await readBody<{ challengeId?: string; response?: AuthenticationResponseJSON }>(event)
  const challengeId = String(body?.challengeId ?? '')
  const response = body?.response
  const credentialId = response?.id
  if (!challengeId || !response || !credentialId) {
    throw createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  }

  const redis = useRedis()
  const expectedChallenge = await redis.get(AUTH_KEYS.consoleWebauthnAuth(challengeId))
  if (!expectedChallenge) {
    throw createError({ statusCode: 410, statusMessage: 'Authentication session expired' })
  }

  const [rows] = await useDb().query<(RowDataPacket & { uuid: string })[]>(
    "SELECT `uuid` FROM `admins` WHERE JSON_CONTAINS(`passkeys`, JSON_OBJECT('id', ?)) LIMIT 1",
    [credentialId]
  )
  const admin = rows[0] ? await fetchAdminByUuid(rows[0].uuid) : null
  const stored = admin?.passkeys.find(passkey => passkey.id === credentialId)
  // 未识别 / 被禁用：同一提示
  const failed = createError({ statusCode: 400, statusMessage: 'Passkey verification failed' })
  if (!admin || admin.status !== 'normal' || !stored) throw failed

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
    console.error('[console] Passkey 登录校验失败：', err)
    throw failed
  }
  if (!verification.verified) throw failed

  await redis.del(AUTH_KEYS.consoleWebauthnAuth(challengeId))

  // 更新签名计数器（防重放）
  stored.counter = verification.authenticationInfo.newCounter
  await saveAdminPasskeys(admin.uuid, admin.passkeys)

  await issueAdminSession(event, admin)
  return { admin: publicAdmin(admin) }
})
