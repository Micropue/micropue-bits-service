import type { H3Event } from 'h3'

// 通用固定窗口限流：Redis 计数，超出后返回 429 + Retry-After。
// 与现有验证码限流一致，按调用方传入的 identity 分桶（user / ip / email+ip）。
const PREFIX = 'rate-limit:'

// INCRBY + 首次设置 TTL 原子执行，避免进程中断留下永不过期的计数键
const CONSUME_SCRIPT = `
local count = redis.call('INCRBY', KEYS[1], ARGV[1])
if tonumber(count) == tonumber(ARGV[1]) then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
elseif redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`

export interface RateLimitOptions {
  // 接口/动作名，不要包含用户输入
  bucket: string
  // 分桶主体：user:<uuid> / ip:<ip> / email+ip:<email>:<ip>
  identity: string
  limit: number
  // 秒
  window: number
  cost?: number
  message?: string
  // Redis 故障时是否放行；默认放行，避免全站因缓存故障不可用
  failOpen?: boolean
}

export interface RateLimitResult {
  limit: number
  remaining: number
  retryAfter: number
}

// SSR 期间 useFetch 会走本机内部请求；这类请求不能按公网 IP 分桶，否则所有页面会共用一个桶
export function isInternalClientIp(ip: string): boolean {
  return ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === '0.0.0.0'
}

export async function enforceRateLimit(event: H3Event, options: RateLimitOptions): Promise<RateLimitResult> {
  const cost = Math.max(1, options.cost ?? 1)
  const key = `${PREFIX}${options.bucket}:${options.identity}`
  let count = 0
  let ttl = 0

  try {
    const result = await useRedis().eval(
      CONSUME_SCRIPT,
      1,
      key,
      String(cost),
      String(options.window)
    ) as [number, number]
    count = Number(result?.[0] ?? 0)
    ttl = Number(result?.[1] ?? 0)
  } catch (err) {
    if (options.failOpen === false) throw err
    console.warn('[rate-limit] Redis unavailable, allowing request:', options.bucket)
  }

  const retryAfter = Math.max(ttl > 0 ? ttl : options.window, 1)
  const remaining = Math.max(options.limit - count, 0)

  if (count > options.limit) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      statusMessage: options.message ?? 'Too many requests, please try again later',
      data: { retryAfterSeconds: retryAfter }
    })
  }

  if (count > 0) {
    setResponseHeader(event, 'X-RateLimit-Limit', String(options.limit))
    setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))
  }

  return { limit: options.limit, remaining, retryAfter }
}

// 登录用户的写操作：按账户限流，避免同一 NAT 下误伤其他用户
export function enforceUserRateLimit(
  event: H3Event,
  userUuid: string,
  bucket: string,
  limit: number,
  window: number,
  cost = 1,
  message?: string
) {
  return enforceRateLimit(event, {
    bucket,
    identity: `user:${userUuid}`,
    limit,
    window,
    cost,
    message
  })
}

// 匿名 / 登录前请求：按客户端 IP 限流，沿用 getClientIp 的取值规则
export function enforceIpRateLimit(
  event: H3Event,
  bucket: string,
  limit: number,
  window: number,
  cost = 1,
  message?: string
) {
  return enforceRateLimit(event, {
    bucket,
    identity: `ip:${getClientIp(event)}`,
    limit,
    window,
    cost,
    message
  })
}
