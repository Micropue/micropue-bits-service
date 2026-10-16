import type { RowDataPacket } from 'mysql2/promise'
import { ADMIN_AUTH_METHOD_KEYS, type AdminAuthMethodKey } from '#shared/utils/admin'
import { useDb } from './db'

// 控制台系统配置：目前只有认证方式开关（热调，立即影响登录页）
// 规范详见 docs-internal/Bits System Console 开发设计规范.md

const AUTH_METHODS_KEY = 'auth.methods'

export type AdminAuthMethods = Record<AdminAuthMethodKey, boolean>

// 默认全开：配置缺失时不能让管理员登不进来
export function defaultAuthMethods(): AdminAuthMethods {
  return { email: true, app: true, passkey: true }
}

function normalizeMethods(value: unknown): AdminAuthMethods {
  const raw = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      })()
    : value
  const methods = defaultAuthMethods()
  if (raw && typeof raw === 'object') {
    for (const key of ADMIN_AUTH_METHOD_KEYS) {
      const flag = (raw as Record<string, unknown>)[key]
      if (typeof flag === 'boolean') methods[key] = flag
    }
  }
  return methods
}

export async function getAuthMethods(): Promise<AdminAuthMethods> {
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `value` FROM `admin_settings` WHERE `key` = ? LIMIT 1',
    [AUTH_METHODS_KEY]
  )
  return rows[0] ? normalizeMethods(rows[0].value) : defaultAuthMethods()
}

// 至少保留一种认证方式，否则所有人都进不了后台
export async function setAuthMethods(methods: AdminAuthMethods): Promise<AdminAuthMethods> {
  if (!ADMIN_AUTH_METHOD_KEYS.some(key => methods[key])) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one sign-in method must stay enabled',
      data: { field: 'authMethods' }
    })
  }
  const normalized = normalizeMethods(methods)
  await useDb().execute(
    `INSERT INTO \`admin_settings\` (\`key\`,\`value\`) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
    [AUTH_METHODS_KEY, JSON.stringify(normalized)]
  )
  return normalized
}
