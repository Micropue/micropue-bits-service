import { timingSafeEqual } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'

// 修改邮箱 · 第二步：核对当前密码 + 新邮箱验证码，校验通过后更新邮箱
// 通过后写入 24h 冷却键，确保每天最多修改一次
const MAX_ATTEMPTS = 5 // 单会话错码上限（兜底）
const CHANGE_COOLDOWN_SECONDS = 24 * 3600 // 24 小时内仅能修改一次

interface SessionData {
  email: string
  code: string
  attempts?: number
}

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string; sessionId?: string; code?: string }>(event)

  await assertPasswordConfirm(user, body?.password)

  const sessionId = String(body?.sessionId ?? '').trim()
  const code = String(body?.code ?? '').trim()
  if (!sessionId || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code' })
  }

  const redis = useRedis()

  // 每日限额（与发码同键）：24 小时内仅能修改一次
  const limitTtl = await redis.ttl(AUTH_KEYS.emailChange(user.uuid))
  if (limitTtl > 0) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Email can only be changed once per day',
      data: { field: 'email', retryAfterSeconds: limitTtl }
    })
  }

  const sessionKey = AUTH_KEYS.session(sessionId)
  const raw = await redis.get(sessionKey)
  if (!raw) {
    throw createError({ statusCode: 410, statusMessage: 'Verification session expired' })
  }
  const session = JSON.parse(raw) as SessionData

  const matched =
    session.code.length === code.length &&
    timingSafeEqual(Buffer.from(session.code), Buffer.from(code))

  if (!matched) {
    const attempts = (session.attempts ?? 0) + 1
    if (attempts >= MAX_ATTEMPTS) {
      await redis.del(sessionKey)
      const currentUid = await redis.get(AUTH_KEYS.active(session.email))
      if (currentUid === sessionId) await redis.del(AUTH_KEYS.active(session.email))
      throw createError({
        statusCode: 410,
        statusMessage: 'Too many incorrect attempts, please request a new code'
      })
    }
    const ttl = await redis.ttl(sessionKey)
    await redis.set(sessionKey, JSON.stringify({ ...session, attempts }), 'EX', Math.max(ttl, 1))
    throw createError({
      statusCode: 400,
      statusMessage: 'Incorrect verification code',
      data: { attemptsLeft: MAX_ATTEMPTS - attempts }
    })
  }

  const newEmail = session.email

  // 新邮箱不可已被占用
  const db = useDb()
  const [taken] = await db.query<RowDataPacket[]>(
    'SELECT 1 FROM `users` WHERE `email` = ? AND `uuid` <> ? LIMIT 1',
    [newEmail, user.uuid]
  )
  if (taken.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'This email is already in use', data: { field: 'email' } })
  }

  // 消费会话
  await redis.del(sessionKey)
  const currentUid = await redis.get(AUTH_KEYS.active(newEmail))
  if (currentUid === sessionId) await redis.del(AUTH_KEYS.active(newEmail))

  try {
    // 若用户名仍为默认值（= 旧邮箱），改邮箱时联动同步，维持「未设置=等于邮箱」判定
    await db.execute(
      'UPDATE `users` SET `email` = ?, `email_verified_at` = NOW(), `username` = IF(`username` = ?, ?, `username`) WHERE `uuid` = ?',
      [newEmail, user.email, newEmail, user.uuid]
    )
  } catch (err) {
    // 并发竞态：邮箱已被他人抢注
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This email is already in use', data: { field: 'email' } })
    }
    throw err
  }

  // 写入 24h 冷却键
  await redis.set(AUTH_KEYS.emailChange(user.uuid), String(Date.now()), 'EX', CHANGE_COOLDOWN_SECONDS)

  return { email: newEmail }
})
