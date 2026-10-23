import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { ADMIN_CODE_ALPHABET, ADMIN_CODE_LENGTH, ADMIN_CODE_TTL_SECONDS } from '#shared/utils/admin'
import { fetchAdminByEmail, issueAdminSession, type AdminUser } from './adminAuth'
import { sendAdminCodeMail } from './mail'
import { enforceIpRateLimit } from './rateLimit'

// 控制台「分步骤动态认证码」核心：发码 + 校验（登录用）
// 风控顺序：账户锁定 → 重发冷却 → 三层限额（IP / IP×邮箱 / 邮箱）→ 发码
// 不暴露邮箱是否在管理员列表中：非管理员邮箱同样计入限额、同样进入验证码步骤，只是不发信

const RESEND_COOLDOWN_SECONDS = 60 // 重发冷却 1 分钟
const IP_HOURLY_LIMIT = 10 // 每 IP 每小时最多 10 次
const PAIR_HOURLY_LIMIT = 3 // 同一 IP + 邮箱每小时最多 3 次
const EMAIL_HOURLY_LIMIT = 5 // 每邮箱每小时最多 5 次（换 IP 也无法绕过）
const QUOTA_WINDOW_SECONDS = 3600

const MAX_ATTEMPTS = 5 // 单个认证码的错码上限（兜底）
const MAX_FAILURES = 3 // 账户级错码上限：达到即锁定 1 小时
const LOCK_SECONDS = 3600

interface CodeSession {
  hash: string
  attempts: number
}

export interface IssuedAdminCode {
  resendAfterSeconds: number
  expiresInSeconds: number
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

// 64 位大小写字母 + 数字混合（crypto.randomInt 无取模偏置）
export function generateAdminCode(): string {
  let code = ''
  for (let index = 0; index < ADMIN_CODE_LENGTH; index++) {
    code += ADMIN_CODE_ALPHABET[randomInt(ADMIN_CODE_ALPHABET.length)]
  }
  return code
}

function normalizeEmail(rawEmail: unknown): string {
  return String(rawEmail ?? '').trim().toLowerCase()
}

export async function issueAdminCode(event: H3Event, rawEmail: unknown): Promise<IssuedAdminCode> {
  const email = normalizeEmail(rawEmail)
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a valid email address' })
  }

  const redis = useRedis()
  const ip = getClientIp(event)

  // 1) 账户锁定：错码超限被临时锁定时，发码一并拦截
  const lockTtl = await redis.ttl(AUTH_KEYS.consoleLock(email))
  if (lockTtl > 0) {
    throw createError({
      statusCode: 423,
      statusMessage: 'Too many incorrect codes',
      data: { retryAfterSeconds: lockTtl }
    })
  }

  // 2) 重发冷却
  const cooldownKey = AUTH_KEYS.consoleCooldown(email)
  const acquired = await redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SECONDS, 'NX')
  if (!acquired) {
    const ttl = await redis.ttl(cooldownKey)
    throw createError({
      statusCode: 429,
      statusMessage: 'Please wait before requesting another code',
      data: { retryAfterSeconds: Math.max(ttl, 1) }
    })
  }

  // 3) 三层限额：任一超限即回滚已计数的层（归零时删除键，避免残留 0 值）
  const refund = async (key: string) => {
    const left = await redis.decr(key)
    if (left <= 0) await redis.del(key)
  }
  const counters = [
    { key: AUTH_KEYS.consoleIpQuota(ip), limit: IP_HOURLY_LIMIT },
    { key: AUTH_KEYS.consolePair(ip, email), limit: PAIR_HOURLY_LIMIT },
    { key: AUTH_KEYS.consoleQuota(email), limit: EMAIL_HOURLY_LIMIT }
  ]
  const applied: string[] = []
  for (const { key, limit } of counters) {
    const used = await redis.incr(key)
    if (used === 1) await redis.expire(key, QUOTA_WINDOW_SECONDS)
    applied.push(key)
    if (used > limit) {
      for (const appliedKey of applied) await refund(appliedKey)
      await redis.del(cooldownKey)
      const ttl = await redis.ttl(key)
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many verification codes requested, please try again later',
        data: { retryAfterSeconds: Math.max(ttl, 1) }
      })
    }
  }

  // 4) 认证码只存哈希；重新发码即覆盖旧码（旧码立即失效）
  const code = generateAdminCode()
  const session: CodeSession = { hash: hashCode(code), attempts: 0 }
  await redis.set(AUTH_KEYS.consoleCode(email), JSON.stringify(session), 'EX', ADMIN_CODE_TTL_SECONDS)

  // 5) 仅管理员邮箱才发送；非管理员一律返回相同结果
  const admin = await fetchAdminByEmail(email)
  if (!admin || admin.status !== 'normal') return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS, expiresInSeconds: ADMIN_CODE_TTL_SECONDS }

  try {
    await sendAdminCodeMail(email, code)
  } catch (err) {
    await redis.del(AUTH_KEYS.consoleCode(email))
    for (const key of applied) await refund(key)
    await redis.del(cooldownKey)
    console.error('[console] 认证码邮件发送失败：', err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send the email',
      // 开发环境附诊断信息（不含敏感值），便于排查 SMTP 配置
      data: process.env.NODE_ENV === 'production'
        ? undefined
        : { smtpHost: process.env.SMTP_HOST ?? '', smtpError: err instanceof Error ? err.message : String(err) }
    })
  }

  // 本地开发提示：SMTP 未配置或收不到信时，可从服务端日志取码（仅 MODE=dev）
  if (process.env.MODE === 'dev') console.log(`[console] 动态认证码（dev）：${email} → ${code}`)

  return { resendAfterSeconds: RESEND_COOLDOWN_SECONDS, expiresInSeconds: ADMIN_CODE_TTL_SECONDS }
}

// 校验并消费认证码（不签发会话）：登录与「绑定登录凭据前的身份确认」共用
export async function consumeAdminCode(rawEmail: unknown, rawCode: unknown): Promise<AdminUser> {
  const email = normalizeEmail(rawEmail)
  const code = String(rawCode ?? '').trim()
  // 提示语与「码错误」完全一致，不区分邮箱是否存在
  const invalid = () => createError({ statusCode: 400, statusMessage: 'Incorrect sign-in code' })
  if (!EMAIL_RE.test(email) || code.length !== ADMIN_CODE_LENGTH) throw invalid()

  const redis = useRedis()

  const lockTtl = await redis.ttl(AUTH_KEYS.consoleLock(email))
  if (lockTtl > 0) {
    throw createError({
      statusCode: 423,
      statusMessage: 'Too many incorrect codes',
      data: { retryAfterSeconds: lockTtl }
    })
  }

  const key = AUTH_KEYS.consoleCode(email)
  const raw = await redis.get(key)
  const session = raw ? (JSON.parse(raw) as CodeSession) : null
  const expected = session ? Buffer.from(session.hash, 'hex') : null
  const actual = Buffer.from(hashCode(code), 'hex')
  const matched = !!expected && timingSafeEqual(expected, actual)

  if (!matched) {
    // 账户级错码计数：跨会话累计，达到上限即锁定 1 小时（计数与锁同期失效）
    const failKey = AUTH_KEYS.consoleFail(email)
    const failures = await redis.incr(failKey)
    if (failures === 1) await redis.expire(failKey, LOCK_SECONDS)
    if (failures >= MAX_FAILURES) {
      await redis.set(AUTH_KEYS.consoleLock(email), '1', 'EX', LOCK_SECONDS)
      throw createError({
        statusCode: 423,
        statusMessage: 'Too many incorrect codes',
        data: { retryAfterSeconds: LOCK_SECONDS }
      })
    }

    const attempts = (session?.attempts ?? 0) + 1
    if (session && attempts >= MAX_ATTEMPTS) {
      await redis.del(key)
      throw createError({ statusCode: 410, statusMessage: 'Too many incorrect attempts, please request a new code' })
    }
    if (session) {
      const ttl = await redis.ttl(key)
      if (ttl > 0) await redis.set(key, JSON.stringify({ hash: session.hash, attempts }), 'EX', ttl)
    }
    // 会话不存在（过期或从未发码）与错码表现完全一致
    throw invalid()
  }

  // 通过：消费认证码，避免重复使用
  await redis.del(key)
  await redis.del(AUTH_KEYS.consoleFail(email))

  const admin = await fetchAdminByEmail(email)
  if (!admin || admin.status !== 'normal') throw invalid()
  return admin
}

// 校验认证码并签发控制台会话（登录）
export async function verifyAdminCode(event: H3Event, rawEmail: unknown, rawCode: unknown): Promise<AdminUser> {
  const admin = await consumeAdminCode(rawEmail, rawCode)
  await issueAdminSession(event, admin)
  return admin
}

// AuthApp 登录失败锁定：与邮箱码登录使用同一账户锁定时长
const APP_FAIL_LIMIT = 3
const APP_FAIL_WINDOW = 15 * 60
const APP_LOCK_SECONDS = 3600

export async function assertAdminAppNotLocked(rawEmail: unknown) {
  const email = normalizeEmail(rawEmail)
  const ttl = await useRedis().ttl(AUTH_KEYS.consoleAppLock(email))
  if (ttl > 0) {
    throw createError({
      statusCode: 423,
      statusMessage: 'Too many incorrect authenticator codes',
      data: { retryAfterSeconds: ttl }
    })
  }
}

export async function registerAdminAppFailure(event: H3Event, rawEmail: unknown) {
  const email = normalizeEmail(rawEmail)
  const redis = useRedis()
  const key = AUTH_KEYS.consoleAppFail(email)
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, APP_FAIL_WINDOW)

  if (count >= APP_FAIL_LIMIT) {
    await redis.set(AUTH_KEYS.consoleAppLock(email), '1', 'EX', APP_LOCK_SECONDS)
    await redis.del(key)
    throw createError({
      statusCode: 423,
      statusMessage: 'Too many incorrect authenticator codes',
      data: { retryAfterSeconds: APP_LOCK_SECONDS }
    })
  }

  await enforceIpRateLimit(
    event,
    'console:app-fail:ip',
    30,
    APP_FAIL_WINDOW,
    1,
    'Too many incorrect authenticator codes, please try again later'
  )
}

export async function clearAdminAppFailure(rawEmail: unknown) {
  await useRedis().del(AUTH_KEYS.consoleAppFail(normalizeEmail(rawEmail)))
}
