import { randomUUID, timingSafeEqual } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'

// 校验邮箱验证码：错码计次（单会话 5 次销毁 + 账户级 3 次锁定 1 小时）
// 通过 = 登录：未注册邮箱自动完成基础注册（密码为空），已注册邮箱直接登录；随后签发 JWT
const MAX_ATTEMPTS = 5 // 单会话错码上限（兜底）
const MAX_LOGIN_FAILURES = 3 // 账户级错码上限：达到即锁定
const LOCK_SECONDS = 3600 // 账户锁定 1 小时

interface SessionData {
  email: string
  code: string
  attempts?: number
}

interface UserRow extends RowDataPacket {
  uuid: string
  email: string
  nickname: string
  status: string
  login_devices: unknown
}

export default defineEventHandler(async event => {
  const body = await readBody<{ sessionId?: string; code?: string }>(event)
  const sessionId = String(body?.sessionId ?? '').trim()
  const code = String(body?.code ?? '').trim()
  if (!sessionId || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification code' })
  }

  const redis = useRedis()
  const sessionKey = AUTH_KEYS.session(sessionId)
  const raw = await redis.get(sessionKey)
  if (!raw) {
    throw createError({ statusCode: 410, statusMessage: 'Verification session expired' })
  }

  const session = JSON.parse(raw) as SessionData

  // 账户锁定：错码超限被锁定时，即使验证码正确也禁止登录新设备（已登录设备的 JWT 不受影响）
  const lockTtl = await redis.ttl(AUTH_KEYS.lock(session.email))
  if (lockTtl > 0) {
    throw createError({
      statusCode: 423,
      statusMessage: 'Account temporarily locked',
      data: { retryAfterSeconds: lockTtl }
    })
  }

  const matched =
    session.code.length === code.length &&
    timingSafeEqual(Buffer.from(session.code), Buffer.from(code))

  if (!matched) {
    // 账户级错码计数：跨会话累计，达到上限即锁定 1 小时（计数与锁同期失效）
    const failKey = AUTH_KEYS.fail(session.email)
    const failCount = await redis.incr(failKey)
    if (failCount === 1) await redis.expire(failKey, LOCK_SECONDS)

    if (failCount >= MAX_LOGIN_FAILURES) {
      // 保留会话，使后续校验统一命中锁定分支返回 423（会话最长 5 分钟内自然过期）
      await redis.set(AUTH_KEYS.lock(session.email), '1', 'EX', LOCK_SECONDS)
      throw createError({
        statusCode: 423,
        statusMessage: 'Account temporarily locked',
        data: { retryAfterSeconds: LOCK_SECONDS }
      })
    }

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

  // 通过：消费会话，清除账户级错码计数
  await redis.del(sessionKey)
  await redis.del(AUTH_KEYS.fail(session.email))
  const currentUid = await redis.get(AUTH_KEYS.active(session.email))
  if (currentUid === sessionId) await redis.del(AUTH_KEYS.active(session.email))

  const db = useDb()
  const [rows] = await db.query<UserRow[]>(
    'SELECT `uuid`, `email`, `nickname`, `status`, `login_devices` FROM `users` WHERE `email` = ? LIMIT 1',
    [session.email]
  )
  let user: UserRow | undefined = rows[0]
  const isNewUser = !user

  if (user) {
    if (user.status !== 'normal') {
      throw createError({ statusCode: 403, statusMessage: 'This account has been disabled' })
    }
  } else {
    // 验证通过 = 注册完成：自动建号（密码为空，昵称自动生成）
    const uuid = randomUUID()
    const nickname = `user_${uuid.replace(/-/g, '').slice(0, 8)}`
    // 兜底：自动生成昵称也须满足 nick 合法性（2-20 位，数字/字母/下划线/短横线）
    if (!isValidNickname(nickname)) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create account' })
    }
    try {
      await db.execute(
        'INSERT INTO `users` (`uuid`, `email`, `username`, `email_verified_at`, `nickname`, `password_hash`) VALUES (?, ?, ?, NOW(), ?, NULL)',
        [uuid, session.email, session.email, nickname]
      )
      user = { uuid, email: session.email, nickname, status: 'normal', login_devices: [] } as UserRow
    } catch (err) {
      // 并发竞态：已被其他请求创建，重新读取
      if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err
      const [again] = await db.query<UserRow[]>(
        'SELECT `uuid`, `email`, `nickname`, `status`, `login_devices` FROM `users` WHERE `email` = ? LIMIT 1',
        [session.email]
      )
      user = again[0]
    }
  }

  if (!user) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create account' })
  }

  await issueSession(event, { uuid: user.uuid, login_devices: user.login_devices })
  // isNewUser 仅在验证码通过（已证明邮箱所有权）后返回，不构成存在性泄露
  return { email: session.email, isNewUser }
})

