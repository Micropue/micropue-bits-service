// Bits System Console 的共享常量：认证方式、动态认证码规格
// Nuxt shared 目录：app 与 server 双向可用，保证前后端校验一致
// 规范详见 docs-internal/Bits System Console 开发设计规范.md
// 管理员分两级：普通管理员 + 高级权限管理员（删除 / 禁用前需邮件网关码确认）

// 认证方式：与 admin_settings 里 auth.methods 的键一一对应，可在控制台热调开关
export const ADMIN_AUTH_METHOD_KEYS = ['email', 'app', 'passkey'] as const

export type AdminAuthMethodKey = (typeof ADMIN_AUTH_METHOD_KEYS)[number]

// 动态邮箱认证码规格：64 位大小写字母 + 数字混合
export const ADMIN_CODE_LENGTH = 64
export const ADMIN_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const ADMIN_CODE_TTL_SECONDS = 600 // 有效期 10 分钟

// 高级权限网关码：256 个字符（128 字节随机数的十六进制表示），3 分钟有效
export const ADMIN_ADVANCED_CODE_LENGTH = 256
export const ADMIN_ADVANCED_CODE_TTL_SECONDS = 180
// 验证通过后 10 分钟内执行删除 / 禁用等高级操作无需再次验证
export const ADMIN_ADVANCED_GRANT_SECONDS = 600

// 高级权限验证方式：在「安全登录」页选择，邮箱码始终可用
export const ADMIN_ADVANCED_METHODS = ['email', 'app', 'passkey'] as const
export type AdminAdvancedMethod = (typeof ADMIN_ADVANCED_METHODS)[number]

// 控制台会话时长：不主动续期、不主动失效，保留 1 周
export const ADMIN_SESSION_DAYS = 7
