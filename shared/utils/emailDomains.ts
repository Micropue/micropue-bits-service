// 允许注册/登录的电子邮件后缀白名单（世界广泛使用的主流邮箱 + 自有域名）
// Nuxt shared 目录：app 与 server 双向可用，保证前后端校验一致
export const ALLOWED_EMAIL_DOMAINS = [
  // 国际
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.jp', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'gmx.com', 'gmx.net', 'mail.com', 'zoho.com',
  'yandex.com', 'fastmail.com',
  // 中国
  'qq.com', 'foxmail.com', '163.com', '126.com', 'yeah.net', '139.com', '189.cn',
  'sina.com', 'sina.cn', 'sohu.com', 'aliyun.com', '21cn.com', '263.net',
  // 韩国
  'naver.com', 'daum.net',
  // 自有域名
  'micropue.com.cn'
] as const

const ALLOWED_SET = new Set<string>(ALLOWED_EMAIL_DOMAINS)

// 取最后一个 @ 之后的域名做白名单校验（大小写不敏感）
export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at < 0) return false
  return ALLOWED_SET.has(email.slice(at + 1).toLowerCase())
}
