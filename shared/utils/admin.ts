// Bits System Console 的共享常量：权限点、认证方式、动态认证码规格
// Nuxt shared 目录：app 与 server 双向可用，保证前后端校验一致
// 规范详见 docs-internal/Bits System Console 开发设计规范.md

// 权限点：逐人配置，不做用户组（前端渲染权限选择 / 后端逐点校验）
// 展示名称在控制台的多语言词表里（键名 = 'perm.' + key），这里只保留权威键列表
export const ADMIN_PERMISSIONS = [
  { key: 'catalog.review' },
  { key: 'catalog.write' },
  { key: 'system.config' },
  { key: 'admins.manage' }
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]['key']

export const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSIONS.map(item => item.key) as AdminPermission[]

export function isValidAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && (ADMIN_PERMISSION_KEYS as string[]).includes(value)
}

// 认证方式：与 admin_settings 里 auth.methods 的键一一对应，可在控制台热调开关
export const ADMIN_AUTH_METHOD_KEYS = ['email', 'app', 'passkey'] as const

export type AdminAuthMethodKey = (typeof ADMIN_AUTH_METHOD_KEYS)[number]

// 动态邮箱认证码规格：64 位大小写字母 + 数字混合
export const ADMIN_CODE_LENGTH = 64
export const ADMIN_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const ADMIN_CODE_TTL_SECONDS = 600 // 有效期 10 分钟

// 控制台会话时长：不主动续期、不主动失效，保留 1 周
export const ADMIN_SESSION_DAYS = 7
