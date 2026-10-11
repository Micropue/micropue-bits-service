// 账户基础信息的共享校验规则（前端表单 + 后端接口单一事实来源）
// 规范详见 项目综合设计.md「二、数据结构与开发规范」

// 昵称：2-20 字符，仅允许数字、大小写字母、下划线、短横线
export const NICKNAME_RE = /^[A-Za-z0-9_-]{2,20}$/

// 密码：6-20 位，字符集同上，且必须同时包含数字与字母
export const PASSWORD_RE = /^(?=.*[0-9])(?=.*[A-Za-z])[A-Za-z0-9_-]{6,20}$/

export function isValidNickname(value: string): boolean {
  return NICKNAME_RE.test(value)
}

// 用户名与昵称同规则（2-20 字符，仅数字/大小写字母/下划线/短横线），但全局唯一且设置后不可修改
export function isValidUsername(value: string): boolean {
  return NICKNAME_RE.test(value)
}

export function isValidPassword(value: string): boolean {
  return PASSWORD_RE.test(value)
}
