import type { RowDataPacket } from 'mysql2/promise'
import { deviceId, type DeviceEntry } from './auth'

// 后台用户管理的字段白名单与对外映射
// 密码哈希、TOTP 密钥、恢复码、Passkey 公钥、设备 token 原文一律不出接口

export const USER_SUMMARY_SQL = [
  '`uuid`', '`email`', '`username`', '`nickname`', '`status`',
  '`created_at`', '`last_login_at`', '`disabled_at`', '`disabled_reason`',
  '(`password_hash` IS NOT NULL) AS `has_password`',
  '(`totp_secret` IS NOT NULL) AS `app_bound`',
  '`two_factor_enabled`',
  'COALESCE(JSON_LENGTH(`passkeys`), 0) AS `passkey_count`',
  '`github_login`'
].join(', ')

export interface UserRow extends RowDataPacket {
  uuid: string
  email: string
  username: string
  nickname: string
  status: string
  created_at: string
  last_login_at: string | null
  disabled_at: string | null
  disabled_reason: string
  has_password: number
  app_bound: number
  two_factor_enabled: number
  passkey_count: number
  github_login: string | null
  bio?: string
  email_verified_at?: string | null
  login_devices?: unknown
  recovery_code_count?: number
}

export function normalizeDevices(value: unknown): DeviceEntry[] {
  const list = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value)
        } catch {
          return []
        }
      })()
    : value
  return Array.isArray(list) ? list as DeviceEntry[] : []
}

// 列表用摘要：够判断"这个账号能不能登录、绑了哪些方式"
export function publicUserSummary(row: UserRow) {
  return {
    uuid: row.uuid,
    email: row.email,
    username: row.username,
    nickname: row.nickname,
    status: row.status,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    disabled_at: row.disabled_at,
    disabled_reason: row.disabled_reason || '',
    hasPassword: !!Number(row.has_password),
    appBound: !!Number(row.app_bound),
    twoFactorEnabled: !!Number(row.two_factor_enabled),
    passkeyCount: Number(row.passkey_count ?? 0),
    githubLogin: row.github_login || null
  }
}

// 详情：多出简介、邮箱验证时间、恢复码数量与脱敏设备列表
export function publicUserDetail(row: UserRow) {
  const devices = normalizeDevices(row.login_devices)
    .map(device => ({
      id: deviceId(device.token),
      name: device.name || device.type || 'Unknown device',
      type: device.type,
      loginAt: device.loginAt
    }))
    .sort((a, b) => b.loginAt.localeCompare(a.loginAt))

  return {
    ...publicUserSummary(row),
    bio: row.bio ?? '',
    email_verified_at: row.email_verified_at ?? null,
    recoveryCodeCount: Number(row.recovery_code_count ?? 0),
    devices
  }
}

// 详情/处置共用：一次取全（含设备列表与恢复码数量），不存在返回 null
export async function fetchUserRow(uuid: string): Promise<UserRow | null> {
  const [rows] = await useDb().query<UserRow[]>(
    `SELECT ${USER_SUMMARY_SQL}, \`bio\`, \`email_verified_at\`, \`login_devices\`,
            COALESCE(JSON_LENGTH(\`recovery_codes\`), 0) AS \`recovery_code_count\`
       FROM \`users\` WHERE \`uuid\` = ? LIMIT 1`,
    [uuid]
  )
  return rows[0] ?? null
}
