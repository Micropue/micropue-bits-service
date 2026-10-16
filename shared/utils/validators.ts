// 账户基础信息的共享校验规则（前端表单 + 后端接口单一事实来源）
// 规范详见 项目综合设计.md「二、数据结构与开发规范」

// 邮箱格式：宽松校验（只做基本形态判断，真实性由验证码流程保证）
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 昵称：2-20 字符，仅允许数字、大小写字母、下划线、短横线
export const NICKNAME_RE = /^[A-Za-z0-9_-]{2,20}$/

// 密码：6-20 位，字符集同上，且必须同时包含数字与字母
export const PASSWORD_RE = /^(?=.*[0-9])(?=.*[A-Za-z])[A-Za-z0-9_-]{6,20}$/

// 保留用户名：用户名是 URL 第一段，与顶级路由冲突的名称禁止使用
const RESERVED_USERNAMES = new Set([
  'api', 'sign', 'login', 'logout', 'account', 'settings', 'explore',
  'search', 'admin', 'static', 'assets', '_nuxt', 'oauth', 'dashboard',
  'language', 'languages', 'framework', 'library', 'tool', 'runtime', 'dependencies', 'legal'
])

export function isValidNickname(value: string): boolean {
  return NICKNAME_RE.test(value)
}

// 用户名与昵称同规则（2-20 字符，仅数字/大小写字母/下划线/短横线），但全局唯一、设置后不可修改、且不能是保留名
export function isValidUsername(value: string): boolean {
  return NICKNAME_RE.test(value) && !RESERVED_USERNAMES.has(value.toLowerCase())
}

// 内容目录名（slug）：URL 第二段 /{username}/{slug}，1-40 位小写字母/数字/短横线
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/

export function isValidSlug(value: string): boolean {
  return SLUG_RE.test(value)
}

export function isValidPassword(value: string): boolean {
  return PASSWORD_RE.test(value)
}
