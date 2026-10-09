import { randomUUID, timingSafeEqual } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'

// 校验邮箱验证码：错码计次（5 次销毁会话）
// 通过 = 登录：未注册邮箱自动完成基础注册（密码为空），已注册邮箱直接登录；随后签发 JWT
const MAX_ATTEMPTS = 5

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

  // 通过：消费会话
  await redis.del(sessionKey)
  const currentUid = await redis.get(AUTH_KEYS.active(session.email))
  if (currentUid === sessionId) await redis.del(AUTH_KEYS.active(session.email))

  const db = useDb()
  const [rows] = await db.query<UserRow[]>(
    'SELECT `uuid`, `email`, `nickname`, `status`, `login_devices` FROM `users` WHERE `email` = ? LIMIT 1',
    [session.email]
  )
  let user: UserRow | undefined = rows[0]
  const registered = !!user

  if (user) {
    if (user.status !== 'normal') {
      throw createError({ statusCode: 403, statusMessage: 'This account has been disabled' })
    }
  } else {
    // 验证通过 = 注册完成：自动建号（密码为空，昵称自动生成）
    const uuid = randomUUID()
    const nickname = `user_${uuid.replace(/-/g, '').slice(0, 8)}`
    try {
      await db.execute(
        'INSERT INTO `users` (`uuid`, `email`, `email_verified_at`, `nickname`, `password_hash`) VALUES (?, ?, NOW(), ?, NULL)',
        [uuid, session.email, nickname]
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
  return { email: session.email, registered }
})

