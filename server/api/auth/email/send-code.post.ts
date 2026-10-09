import { randomInt, randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'

// 发送邮箱验证码：Redis 存「校验会话（uid + code）」，重发使旧会话失效，带冷却与小时限额
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CODE_TTL_SECONDS = 300 // 验证码有效期 5 分钟
const RESEND_COOLDOWN_SECONDS = 60 // 重发冷却 1 分钟
const HOURLY_LIMIT = 5 // 每邮箱每小时最多 5 次
const IP_HOURLY_LIMIT = 5 // 每 IP 每小时最多 5 次
const QUOTA_WINDOW_SECONDS = 3600

export default defineEventHandler(async event => {
  const body = await readBody<{ email?: string }>(event)
  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email address' })
  }

  const redis = useRedis()
  // 内网穿透/代理场景取 x-forwarded-for 中的客户端 IP，直连时取连接地址
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'

  // 计数回滚：归零时删除键，避免残留 0 值
  const refund = async (key: string) => {
    const left = await redis.decr(key)
    if (left <= 0) await redis.del(key)
  }

  // 1) 重发冷却：1 分钟一次
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

  // 2) IP 小时限额：每 IP 最多 5 次
  const ipKey = AUTH_KEYS.ipQuota(ip)
  const ipUsed = await redis.incr(ipKey)
  if (ipUsed === 1) await redis.expire(ipKey, QUOTA_WINDOW_SECONDS)
  if (ipUsed > IP_HOURLY_LIMIT) {
    await refund(ipKey)
    await redis.del(cooldownKey)
    const ttl = await redis.ttl(ipKey)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests from this network, please try again later',
      data: { retryAfterSeconds: Math.max(ttl, 1) }
    })
  }

  // 3) 邮箱小时限额：每邮箱最多 5 次
  const quotaKey = AUTH_KEYS.quota(email)
  const used = await redis.incr(quotaKey)
  if (used === 1) await redis.expire(quotaKey, QUOTA_WINDOW_SECONDS)
  if (used > HOURLY_LIMIT) {
    await refund(quotaKey)
    await refund(ipKey)
    await redis.del(cooldownKey)
    const ttl = await redis.ttl(quotaKey)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many verification codes requested, please try again later',
      data: { retryAfterSeconds: Math.max(ttl, 1) }
    })
  }

  // 4) 新建校验会话，同时使该邮箱的旧会话（旧验证码）失效
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const sessionId = randomUUID()
  const previousUid = await redis.get(AUTH_KEYS.active(email))
  if (previousUid) await redis.del(AUTH_KEYS.session(previousUid))

  await redis.set(AUTH_KEYS.session(sessionId), JSON.stringify({ email, code }), 'EX', CODE_TTL_SECONDS)
  await redis.set(AUTH_KEYS.active(email), sessionId, 'EX', CODE_TTL_SECONDS)

  // 5) 检测电子邮件注册状态
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT uuid FROM `users` WHERE `email` = ? LIMIT 1',
    [email]
  )
  const registered = rows.length > 0

  // 6) 发送验证码邮件；失败则回滚计数与会话，允许立即重试
  try {
    await sendVerificationCodeMail(email, code)
  } catch (err) {
    const currentUid = await redis.get(AUTH_KEYS.active(email))
    if (currentUid === sessionId) await redis.del(AUTH_KEYS.active(email))
    await redis.del(AUTH_KEYS.session(sessionId))
    await refund(quotaKey)
    await refund(ipKey)
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
    registered,
    resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
    expiresInSeconds: CODE_TTL_SECONDS
  }
})
