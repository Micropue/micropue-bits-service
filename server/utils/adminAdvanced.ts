import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  ADMIN_ADVANCED_CODE_LENGTH,
  ADMIN_ADVANCED_CODE_TTL_SECONDS,
  ADMIN_ADVANCED_GRANT_SECONDS
} from '#shared/utils/admin'
import type { AdminUser } from './adminAuth'
import { sendAdvancedCodeMail } from './mail'

// 高级权限网关码：删除 / 禁用等操作前向管理员本人邮箱发送 256 字符一次性码
// 码 3 分钟有效；验证通过后 10 分钟内免再次验证（Redis 授权标记）

const RESEND_COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 5

interface CodeSession {
  hash: string
  attempts: number
}

export interface IssuedAdvancedCode {
  resendAfterSeconds: number
  expiresInSeconds: number
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function normalizeCode(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, '').toLowerCase()
}

export async function getAdvancedGrantSeconds(uuid: string): Promise<number> {
  try {
    const ttl = await useRedis().ttl(AUTH_KEYS.consoleAdvancedGrant(uuid))
    return ttl > 0 ? ttl : 0
  } catch (err) {
    // 状态查询失败时按“未验证”处理，避免 Redis 故障把整个控制台登录态打挂
    console.warn('[console] 高级权限状态读取失败：', err instanceof Error ? err.message : err)
    return 0
  }
}

// 任一验证方式通过后统一授权 10 分钟（邮箱码 / AuthApp / Passkey）
export async function grantAdvancedAccess(uuid: string) {
  await useRedis().set(
    AUTH_KEYS.consoleAdvancedGrant(uuid),
    '1',
    'EX',
    ADMIN_ADVANCED_GRANT_SECONDS
  )
  return { verified: true as const, expiresInSeconds: ADMIN_ADVANCED_GRANT_SECONDS }
}

export async function clearAdvancedGrant(uuid: string) {
  try {
    await useRedis().del(AUTH_KEYS.consoleAdvancedGrant(uuid))
  } catch (err) {
    console.warn('[console] 高级权限授权清理失败：', err instanceof Error ? err.message : err)
  }
}

// 管理员列表 / 创建 / 编辑等管理入口：只允许高级权限管理员，不要求当前已通过网关码
export function assertAdvancedPermission(admin: AdminUser) {
  if (!admin.advanced) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Advanced permission is required for this action',
      data: { code: 'ADVANCED_REQUIRED' }
    })
  }
}

// 高级权限接口守卫：没有高级权限 → 403 ADVANCED_REQUIRED；未验证网关码 → 403 NEEDS_ADVANCED_CODE
export async function assertAdvancedAccess(admin: AdminUser) {
  assertAdvancedPermission(admin)
  if (!(await getAdvancedGrantSeconds(admin.uuid))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Verify your advanced permission before continuing',
      data: { code: 'NEEDS_ADVANCED_CODE' }
    })
  }
}

export async function issueAdvancedCode(admin: AdminUser): Promise<IssuedAdvancedCode> {
  const redis = useRedis()
  const cooldownKey = AUTH_KEYS.consoleAdvancedCooldown(admin.uuid)
  const acquired = await redis.set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SECONDS, 'NX')
  if (!acquired) {
    const ttl = await redis.ttl(cooldownKey)
    throw createError({
      statusCode: 429,
      statusMessage: 'Please wait before requesting another code',
      data: { retryAfterSeconds: Math.max(ttl, 1) }
    })
  }

  // 128 字节随机数 = 1024 位；十六进制表示 256 个字符
  const code = randomBytes(128).toString('hex')
  const session: CodeSession = { hash: hashCode(code), attempts: 0 }
  await redis.set(
    AUTH_KEYS.consoleAdvancedCode(admin.uuid),
    JSON.stringify(session),
    'EX',
    ADMIN_ADVANCED_CODE_TTL_SECONDS
  )

  try {
    await sendAdvancedCodeMail(admin.email, code)
  } catch (err) {
    await redis.del(AUTH_KEYS.consoleAdvancedCode(admin.uuid))
    await redis.del(cooldownKey)
    console.error('[console] 高级权限网关码发送失败：', err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to send the gateway code' })
  }

  if (process.env.MODE === 'dev') {
    console.log(`[console] 高级权限网关码（dev）：${admin.email} → ${code}`)
  }

  return {
    resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
    expiresInSeconds: ADMIN_ADVANCED_CODE_TTL_SECONDS
  }
}

export async function verifyAdvancedCode(admin: AdminUser, rawCode: unknown) {
  const code = normalizeCode(rawCode)
  const invalid = () => createError({
    statusCode: 400,
    statusMessage: 'Gateway code is incorrect or expired'
  })
  if (code.length !== ADMIN_ADVANCED_CODE_LENGTH || !/^[0-9a-f]+$/.test(code)) throw invalid()

  const redis = useRedis()
  const key = AUTH_KEYS.consoleAdvancedCode(admin.uuid)
  const raw = await redis.get(key)
  const session = raw ? (JSON.parse(raw) as CodeSession) : null

  const matched = !!session && session.hash.length === 64 && timingSafeEqual(
    Buffer.from(session.hash, 'hex'),
    Buffer.from(hashCode(code), 'hex')
  )

  if (!matched) {
    if (session) {
      const attempts = session.attempts + 1
      if (attempts >= MAX_ATTEMPTS) {
        await redis.del(key)
        throw createError({
          statusCode: 410,
          statusMessage: 'Too many incorrect attempts, please request a new code'
        })
      }
      const ttl = await redis.ttl(key)
      if (ttl > 0) await redis.set(key, JSON.stringify({ hash: session.hash, attempts }), 'EX', ttl)
    }
    throw invalid()
  }

  await redis.del(key)
  return grantAdvancedAccess(admin.uuid)
}
