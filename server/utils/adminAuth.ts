import { randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2/promise'
import { useDb } from './db'
import { getClientIp } from './clientIp'
import { normalizePasskeys, type StoredPasskey } from './webauthn'

// Bits System Console 会话：JWT Cookie（bits_admin）+ admin_sessions 落库，可立即撤销
// 会话 7 天不续期、不主动失效；退出登录 / 禁用管理员 / 删除会话都会立刻失效
// 规范详见 docs-internal/Bits System Console 开发设计规范.md

export const ADMIN_COOKIE = 'bits_admin'
export const ADMIN_SESSION_SECONDS = ADMIN_SESSION_DAYS * 24 * 60 * 60

export interface AdminUser {
  uuid: string
  email: string
  name: string
  // AuthApp（TOTP）密钥密文：存在 = 已绑定
  totp_secret: string | null
  // 已绑定的 Passkey 列表
  passkeys: StoredPasskey[]
  status: string
  last_login_at: string | null
  created_at: string | null
}

const ADMIN_COLUMNS = '`uuid`, `email`, `name`, `totp_secret`, `passkeys`, `status`, `last_login_at`, `created_at`'

type AdminRow = RowDataPacket & Omit<AdminUser, 'passkeys'> & { passkeys: unknown }

function jwtKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET 未配置（.env）')
  return new TextEncoder().encode(secret)
}

function toAdmin(row: AdminRow): AdminUser {
  return {
    ...row,
    passkeys: normalizePasskeys(row.passkeys)
  }
}

// ---------- 登录凭据（AuthApp / Passkey）写入 ----------

export async function saveAdminPasskeys(uuid: string, passkeys: StoredPasskey[]) {
  await useDb().execute('UPDATE `admins` SET `passkeys` = ? WHERE `uuid` = ?', [JSON.stringify(passkeys), uuid])
}

export async function setAdminTotpSecret(uuid: string, encrypted: string | null) {
  await useDb().execute('UPDATE `admins` SET `totp_secret` = ? WHERE `uuid` = ?', [encrypted, uuid])
}

// ---------- 敏感操作（绑定/解绑登录凭据）身份确认授权 ----------
// 与前台「敏感操作二次验证」同一思路：先验证一次身份，10 分钟内可连续绑定/解绑

export const CONSOLE_GRANT_SECONDS = 600

export async function grantConsoleVerify(uuid: string) {
  await useRedis().set(AUTH_KEYS.consoleGrant(uuid), '1', 'EX', CONSOLE_GRANT_SECONDS)
}

export async function hasConsoleVerify(uuid: string): Promise<boolean> {
  return (await useRedis().exists(AUTH_KEYS.consoleGrant(uuid))) === 1
}

export async function assertConsoleVerify(admin: AdminUser) {
  if (!(await hasConsoleVerify(admin.uuid))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Please verify your identity before changing sign-in methods',
      data: { code: 'NEEDS_VERIFY' }
    })
  }
}

// 对外返回的管理员信息：不带 TOTP 密钥密文与 Passkey 公钥（仅给出绑定状态与数量）
export interface PublicAdmin {
  uuid: string
  email: string
  name: string
  status: string
  last_login_at: string | null
  created_at: string | null
  appBound: boolean
  passkeyCount: number
}

export function publicAdmin(admin: AdminUser): PublicAdmin {
  return {
    uuid: admin.uuid,
    email: admin.email,
    name: admin.name,
    status: admin.status,
    last_login_at: admin.last_login_at,
    created_at: admin.created_at,
    appBound: !!admin.totp_secret,
    passkeyCount: admin.passkeys.length
  }
}

// 可能为 null 的场合（未登录 / 已被删除）
export function publicAdminOrNull(admin: AdminUser | null): PublicAdmin | null {
  return admin ? publicAdmin(admin) : null
}

export async function fetchAdminByEmail(email: string): Promise<AdminUser | null> {
  const [rows] = await useDb().query<AdminRow[]>(
    `SELECT ${ADMIN_COLUMNS} FROM \`admins\` WHERE \`email\` = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  )
  return rows[0] ? toAdmin(rows[0]) : null
}

export async function fetchAdminByUuid(uuid: string): Promise<AdminUser | null> {
  const [rows] = await useDb().query<AdminRow[]>(
    `SELECT ${ADMIN_COLUMNS} FROM \`admins\` WHERE \`uuid\` = ? LIMIT 1`,
    [uuid]
  )
  return rows[0] ? toAdmin(rows[0]) : null
}

// 登录成功：写会话行 + 登录时间 + 签发 JWT Cookie
export async function issueAdminSession(event: H3Event, admin: AdminUser) {
  const sid = randomUUID()
  const db = useDb()
  await db.execute(
    `INSERT INTO \`admin_sessions\` (\`sid\`,\`admin_uuid\`,\`user_agent\`,\`ip\`,\`expires_at\`)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [sid, admin.uuid, (getRequestHeader(event, 'user-agent') || '').slice(0, 255), getClientIp(event), ADMIN_SESSION_SECONDS]
  )
  await db.execute('UPDATE `admins` SET `last_login_at` = NOW() WHERE `uuid` = ?', [admin.uuid])

  const jwt = await new SignJWT({ uuid: admin.uuid, sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS)
    .sign(jwtKey())

  setCookie(event, ADMIN_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS
  })
}

// 读取当前管理员：Cookie 无效 / 会话不存在或已过期 / 管理员被禁用都返回 null
export async function getAdmin(event: H3Event): Promise<AdminUser | null> {
  const jwt = getCookie(event, ADMIN_COOKIE)
  if (!jwt) return null

  let payload: { uuid?: string; sid?: string }
  try {
    payload = (await jwtVerify(jwt, jwtKey())).payload as { uuid?: string; sid?: string }
  } catch {
    return null
  }
  if (!payload.uuid || !payload.sid) return null

  const [sessions] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid` FROM `admin_sessions` WHERE `sid` = ? AND `expires_at` > NOW() LIMIT 1',
    [payload.sid]
  )
  if (!sessions[0]) return null

  const admin = await fetchAdminByUuid(payload.uuid)
  if (!admin || admin.status !== 'normal') return null
  return admin
}

// 控制台接口守卫：未登录 401（登录的管理员权限相同，不再逐点校验）
export async function requireAdmin(event: H3Event): Promise<AdminUser> {
  const admin = await getAdmin(event)
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  return admin
}

// 管理员列表（按加入时间）
export async function listAdmins(): Promise<AdminUser[]> {
  const [rows] = await useDb().query<AdminRow[]>(
    `SELECT ${ADMIN_COLUMNS} FROM \`admins\` ORDER BY \`created_at\` ASC`
  )
  return rows.map(toAdmin)
}

// 至少要留下一个正常状态的管理员，否则后台再也没人能进
export async function assertNotLastAdmin(target: AdminUser) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT COUNT(*) AS `count` FROM `admins` WHERE `status` = 'normal' AND `uuid` <> ?",
    [target.uuid]
  )
  if (Number(rows[0]?.count ?? 0) === 0) {
    throw createError({ statusCode: 409, statusMessage: 'At least one active administrator must remain' })
  }
}

// 退出登录：删除当前会话，其余设备的会话不受影响
export async function revokeAdminSession(event: H3Event) {
  const jwt = getCookie(event, ADMIN_COOKIE)
  if (jwt) {
    try {
      const payload = (await jwtVerify(jwt, jwtKey())).payload as { sid?: string }
      if (payload.sid) await useDb().execute('DELETE FROM `admin_sessions` WHERE `sid` = ?', [payload.sid])
    } catch {
      // Cookie 已失效：无需处理
    }
  }
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
}
