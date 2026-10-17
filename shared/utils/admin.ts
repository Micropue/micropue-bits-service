// Bits System Console 的共享常量：认证方式、动态认证码规格
// Nuxt shared 目录：app 与 server 双向可用，保证前后端校验一致
// 规范详见 docs-internal/Bits System Console 开发设计规范.md
// 所有登录管理员权限相同（不做权限点 / 用户组）

// 认证方式：与 admin_settings 里 auth.methods 的键一一对应，可在控制台热调开关
export const ADMIN_AUTH_METHOD_KEYS = ['email', 'app', 'passkey'] as const

export type AdminAuthMethodKey = (typeof ADMIN_AUTH_METHOD_KEYS)[number]

// 动态邮箱认证码规格：64 位大小写字母 + 数字混合
export const ADMIN_CODE_LENGTH = 64
export const ADMIN_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const ADMIN_CODE_TTL_SECONDS = 600 // 有效期 10 分钟

// 控制台会话时长：不主动续期、不主动失效，保留 1 周
export const ADMIN_SESSION_DAYS = 7
