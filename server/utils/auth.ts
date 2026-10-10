import { randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2/promise'
import { useDb } from './db'
import { verifyPassword } from './password'

// 登录会话：JWT 载荷含 用户UUID + 登录校验TOKEN + 过期时间（规范详见 项目综合设计.md「三、登录安全」）
// 登录校验 token 同时写入 users.login_devices，设备被下线后 JWT 立即失效

export const AUTH_COOKIE = 'bits_token'
const SESSION_SECONDS = 180 * 24 * 60 * 60 // 长时间有效：180 天
const MAX_DEVICES = 5 // 登录设备上限，超出自动淘汰最久未登录的设备

export interface DeviceEntry {
  type: string
  token: string
  loginAt: string
}

export interface AuthUser {
  uuid: string
  email: string
  username: string
  nickname: string
  status: string
  created_at: string | null
  last_login_at: string | null
  password_hash: string | null
  login_devices: DeviceEntry[]
  sessionToken: string
}

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
  let devices = normalizeDevices(user.login_devices)
  devices.push({
    type: detectDeviceType(getRequestHeader(event, 'user-agent') || ''),
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

  const [rows] = await useDb().query<
    (RowDataPacket & {
      uuid: string
      email: string
      username: string
      nickname: string
      status: string
      created_at: string | null
      last_login_at: string | null
      password_hash: string | null
      login_devices: unknown
    })[]
  >(
    'SELECT `uuid`, `email`, `username`, `nickname`, `status`, `created_at`, `last_login_at`, `password_hash`, `login_devices` FROM `users` WHERE `uuid` = ? LIMIT 1',
    [payload.uuid]
  )
  const user = rows[0]
  if (!user || user.status !== 'normal') return null

  // 设备下线耦合：JWT 中的登录校验 token 必须仍存在于 login_devices
  const devices = normalizeDevices(user.login_devices)
  if (!devices.some(d => d.token === payload.token)) return null

  return { ...user, login_devices: devices, sessionToken: payload.token }
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
