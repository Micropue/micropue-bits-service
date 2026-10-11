import { randomInt, randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'

// 邮箱验证码发放核心：登录与「邮箱修改」共用同一套安全逻辑
// 风控顺序：邮箱后缀白名单 → 人机校验 → 账户锁定 → 重发冷却 → 三层限额（IP / IP×邮箱 / 邮箱）

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CODE_TTL_SECONDS = 300 // 验证码有效期 5 分钟
const RESEND_COOLDOWN_SECONDS = 60 // 重发冷却 1 分钟
const IP_HOURLY_LIMIT = 10 // 每 IP 每小时最多 10 次
const PAIR_HOURLY_LIMIT = 3 // 同一 IP + 邮箱每小时最多 3 次
const EMAIL_HOURLY_LIMIT = 5 // 每邮箱每小时最多 5 次（与 IP 无关，换 IP 也无法绕过）
const QUOTA_WINDOW_SECONDS = 3600

export interface IssueEmailCodeOptions {
  captchaToken?: string
  // 是否强制人机校验：登录仅在「无活跃会话」时要求；邮箱修改始终要求
  requireCaptcha?: boolean
}

export interface IssuedEmailCode {
  sessionId: string
  resendAfterSeconds: number
  expiresInSeconds: number
}

export async function issueEmailCode(
  event: H3Event,
  rawEmail: string,
  options: IssueEmailCodeOptions = {}
): Promise<IssuedEmailCode> {
  const email = String(rawEmail ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || !isAllowedEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported email address' })
  }

  const redis = useRedis()
  // 取后端连接地址（生产不信任 X-Forwarded-For 等可伪造请求头，详见 clientIp.ts）
  const ip = getClientIp(event)

  // 人机校验：登录时仅当该邮箱无活跃会话（发起新会话）才要求；重发沿用已通过校验的会话
  const activeSession = await redis.get(AUTH_KEYS.active(email))
  if (options.requireCaptcha || !activeSession) {
    await verifyHcaptcha(event, options.captchaToken)
  }

  // 计数回滚：归零时删除键，避免残留 0 值
  const refund = async (key: string) => {
    const left = await redis.decr(key)
    if (left <= 0) await redis.del(key)
  }

  // 1) 账户锁定：错码超限被临时锁定时，发码一并拦截
  const lockTtl = await redis.ttl(AUTH_KEYS.lock(email))
  if (lockTtl > 0) {
    throw createError({
      statusCode: 423,
      statusMessage: 'Account temporarily locked',
      data: { retryAfterSeconds: lockTtl }
    })
  }

  // 2) 重发冷却：1 分钟一次
  const cooldownKey = AUTH_KEYS.cooldown(email)
  const acquired = await redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SECONDS, 'NX')
  if (!acquired) {
    const ttl = await redis.ttl(cooldownKey)
    throw createError({
      statusCode: 429,
      statusMessage: 'Please wait before requesting another code',
      data: { retryAfterSeconds: Math.max(ttl, 1) }
    })
  }

  // 3) 三层限额：任一超限即回滚已计数的层
  const counters = [
    { key: AUTH_KEYS.ipQuota(ip), limit: IP_HOURLY_LIMIT },
    { key: AUTH_KEYS.sendPair(ip, email), limit: PAIR_HOURLY_LIMIT },
    { key: AUTH_KEYS.quota(email), limit: EMAIL_HOURLY_LIMIT }
  ]
  const applied: string[] = []
  for (const { key, limit } of counters) {
    const used = await redis.incr(key)
    if (used === 1) await redis.expire(key, QUOTA_WINDOW_SECONDS)
    applied.push(key)
    if (used > limit) {
      for (const k of applied) await refund(k)
      await redis.del(cooldownKey)
      const ttl = await redis.ttl(key)
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many verification codes requested, please try again later',
        data: { retryAfterSeconds: Math.max(ttl, 1) }
      })
    }
  }

  // 4) 新建校验会话，同时使该邮箱的旧会话（旧验证码）失效
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const sessionId = randomUUID()
  const previousUid = await redis.get(AUTH_KEYS.active(email))
  if (previousUid) await redis.del(AUTH_KEYS.session(previousUid))

  await redis.set(AUTH_KEYS.session(sessionId), JSON.stringify({ email, code }), 'EX', CODE_TTL_SECONDS)
  await redis.set(AUTH_KEYS.active(email), sessionId, 'EX', CODE_TTL_SECONDS)

  // 5) 发送验证码邮件；失败则回滚计数与会话，允许立即重试
  try {
    await sendVerificationCodeMail(email, code)
  } catch (err) {
    const currentUid = await redis.get(AUTH_KEYS.active(email))
    if (currentUid === sessionId) await redis.del(AUTH_KEYS.active(email))
    await redis.del(AUTH_KEYS.session(sessionId))
    for (const k of applied) await refund(k)
    await redis.del(cooldownKey)
    console.error('[auth] 验证码邮件发送失败：', err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send verification email',
      // 开发环境附加诊断信息（不含敏感值），便于排查 SMTP 配置
      data:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              smtpUserLen: (process.env.SMTP_USER ?? '').length,
              smtpPassLen: (process.env.SMTP_PASSWORD ?? '').length,
              smtpHost: process.env.SMTP_HOST ?? '',
              smtpPort: process.env.SMTP_PORT ?? '',
              smtpError: err instanceof Error ? err.message : String(err)
            }
    })
  }

  return {
    sessionId,
    resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
    expiresInSeconds: CODE_TTL_SECONDS
  }
}
