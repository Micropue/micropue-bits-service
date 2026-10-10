import { createHash, randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2/promise'
import { useDb } from './db'
import { verifyPassword } from './password'
import { describeUserAgent, normalizePasskeys } from './webauthn'

// 登录会话：JWT 载荷含 用户UUID + 登录校验TOKEN + 过期时间（规范详见 项目综合设计.md「三、登录安全」）
// 登录校验 token 同时写入 users.login_devices，设备被下线后 JWT 立即失效

export const AUTH_COOKIE = 'bits_token'
const SESSION_SECONDS = 180 * 24 * 60 * 60 // 长时间有效：180 天
export const MAX_DEVICES = 5 // 登录设备上限，超出自动淘汰最久未登录的设备

export interface DeviceEntry {
  type: string
  token: string
  loginAt: string
  name?: string // User-Agent 推导的设备名（如 "Chrome on macOS"）
}

// 设备对外标识：token 属会话凭据，仅回传其短哈希，不回传原文
export function deviceId(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16)
}

export interface AuthUser {
  uuid: string
  email: string
  username: string
  nickname: string
  status: string
  github_id: string | number | null
  github_login: string | null
  totp_secret: string | null
  two_factor_enabled: number
  recovery_codes: unknown
  passkeys: unknown
  created_at: string | null
  last_login_at: string | null
  password_hash: string | null
  login_devices: DeviceEntry[]
  sessionToken: string
}

const USER_COLUMNS =
  '`uuid`, `email`, `username`, `nickname`, `status`, `github_id`, `github_login`, `totp_secret`, `two_factor_enabled`, `recovery_codes`, `passkeys`, `created_at`, `last_login_at`, `password_hash`, `login_devices`'

type UserRow = RowDataPacket & Omit<AuthUser, 'login_devices' | 'sessionToken'> & { login_devices: unknown }

function jwtKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET 未配置（.env）')
  return new TextEncoder().encode(secret)
}

// 设备类型粗判（User-Agent）
function detectDeviceType(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return 'Tablet'
  if (/mobile|iphone|android/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

// 与数据库时间格式一致：YYYY-MM-DD HH:mm:ss（东八区）
function nowString(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

function normalizeDevices(value: unknown): DeviceEntry[] {
  if (Array.isArray(value)) return value as DeviceEntry[]
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as DeviceEntry[]
    } catch {
      return []
    }
  }
  return []
}

// 签发登录会话：追加设备记录 + 覆盖登录时间 + 写 HttpOnly Cookie
export async function issueSession(event: H3Event, user: { uuid: string; login_devices?: unknown }) {
  const token = randomUUID()
  const ua = getRequestHeader(event, 'user-agent') || ''
  let devices = normalizeDevices(user.login_devices)
  devices.push({
    type: detectDeviceType(ua),
    name: describeUserAgent(ua),
    token,
    loginAt: nowString()
  })

  // 设备上限：按登录时间保留最近 MAX_DEVICES 台，自动淘汰最久未登录的
  if (devices.length > MAX_DEVICES) {
    devices = devices.sort((a, b) => a.loginAt.localeCompare(b.loginAt)).slice(-MAX_DEVICES)
  }

  await useDb().execute(
    'UPDATE `users` SET `login_devices` = ?, `last_login_at` = NOW() WHERE `uuid` = ?',
    [JSON.stringify(devices), user.uuid]
  )

  const jwt = await new SignJWT({ uuid: user.uuid, token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .sign(jwtKey())

  setCookie(event, AUTH_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS
  })
  return token
}

// 第一因子（邮箱验证码 / GitHub / 密码）通过后：
// - 未开启两步验证 → 直接签发会话
// - 已开启 → 不签发，返回待校验票据，等第二因子（AuthApp / Passkey / 恢复码）通过再签发
export type SessionOrTwoFactor =
  | { requires2fa: false }
  | { requires2fa: true; ticket: string; methods: string[] }

export async function beginSessionOrTwoFactor(
  event: H3Event,
  user: { uuid: string; login_devices?: unknown; two_factor_enabled?: number; totp_secret?: string | null; passkeys?: unknown }
): Promise<SessionOrTwoFactor> {
  if (user.two_factor_enabled) {
    const ticket = randomUUID()
    await useRedis().set(AUTH_KEYS.twoFaTicket(ticket), JSON.stringify({ uuid: user.uuid }), 'EX', 300)
    return { requires2fa: true, ticket, methods: twoFactorMethods(user) }
  }
  await issueSession(event, { uuid: user.uuid, login_devices: user.login_devices })
  return { requires2fa: false }
}

// 读取两步验证票据对应的用户（第二因子阶段，尚未签发会话）
export async function resolveTwoFaTicket(ticket: string): Promise<AuthUser> {
  if (!ticket) throw createError({ statusCode: 400, statusMessage: 'Missing ticket' })
  const raw = await useRedis().get(AUTH_KEYS.twoFaTicket(ticket))
  if (!raw) throw createError({ statusCode: 410, statusMessage: 'Sign-in attempt expired' })
  const { uuid } = JSON.parse(raw) as { uuid: string }
  const user = await fetchAuthUserByUuid(uuid)
  if (!user || user.status !== 'normal') {
    throw createError({ statusCode: 403, statusMessage: 'This account has been disabled' })
  }
  return user
}

// 第二因子通过：消费票据并签发会话
export async function completeTwoFactor(event: H3Event, ticket: string, user: AuthUser) {
  const redis = useRedis()
  await redis.del(AUTH_KEYS.twoFaTicket(ticket))
  await redis.del(AUTH_KEYS.twoFaFail(ticket))
  await issueSession(event, { uuid: user.uuid, login_devices: user.login_devices })
}

// 第二因子失败：计数，达上限（5 次）作废本次登录，需重新走第一因子
export async function registerTwoFactorFailure(ticket: string): Promise<never> {
  const redis = useRedis()
  const key = AUTH_KEYS.twoFaFail(ticket)
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 300)
  if (count >= 5) {
    await redis.del(AUTH_KEYS.twoFaTicket(ticket))
    await redis.del(key)
    throw createError({ statusCode: 410, statusMessage: 'Too many attempts, please sign in again' })
  }
  throw createError({ statusCode: 400, statusMessage: 'Incorrect code' })
}

// 读取当前登录用户；无效/过期/设备已下线/账户禁用均返回 null
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const jwt = getCookie(event, AUTH_COOKIE)
  if (!jwt) return null

  const key = jwtKey()
  let payload: { uuid?: string; token?: string }
  try {
    const verified = await jwtVerify(jwt, key)
    payload = verified.payload as { uuid?: string; token?: string }
  } catch {
    return null
  }
  if (!payload.uuid || !payload.token) return null

  const [rows] = await useDb().query<UserRow[]>(
    `SELECT ${USER_COLUMNS} FROM \`users\` WHERE \`uuid\` = ? LIMIT 1`,
    [payload.uuid]
  )
  const user = rows[0]
  if (!user || user.status !== 'normal') return null

  // 设备下线耦合：JWT 中的登录校验 token 必须仍存在于 login_devices
  const devices = normalizeDevices(user.login_devices)
  if (!devices.some(d => d.token === payload.token)) return null

  return { ...user, login_devices: devices, sessionToken: payload.token }
}

// 按 UUID 读取完整用户（用于两步验证第二因子阶段：此时尚未签发会话）
export async function fetchAuthUserByUuid(uuid: string): Promise<AuthUser | null> {
  const [rows] = await useDb().query<UserRow[]>(
    `SELECT ${USER_COLUMNS} FROM \`users\` WHERE \`uuid\` = ? LIMIT 1`,
    [uuid]
  )
  const user = rows[0]
  if (!user) return null
  return { ...user, login_devices: normalizeDevices(user.login_devices), sessionToken: '' }
}

// 账户当前可用的第二因子（app = 已绑定 AuthApp；passkey = 已有通行密钥）
export function twoFactorMethods(user: { totp_secret?: string | null; passkeys?: unknown }): string[] {
  const methods: string[] = []
  if (user.totp_secret) methods.push('app')
  if (normalizePasskeys(user.passkeys).length > 0) methods.push('passkey')
  return methods
}

export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  return user
}

// 敏感操作（如修改邮箱）要求再次确认当前密码
// - 未设置密码（邮箱验证码注册且未补设）：返回 409，前端提示先设置密码
// - 密码错误：返回 403
export async function assertPasswordConfirm(user: AuthUser, password: unknown) {
  if (!user.password_hash) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Please set a password before changing your email',
      data: { field: 'password', code: 'NO_PASSWORD' }
    })
  }
  if (typeof password !== 'string' || !(await verifyPassword(password, user.password_hash))) {
    throw createError({ statusCode: 403, statusMessage: 'Incorrect password', data: { field: 'password' } })
  }
}
