import type { H3Event } from 'h3'

// WebAuthn（Passkey）辅助：RP 配置推导、passkeys 读写、时间格式
// 环境变量（可留空自动推导）：WEBAUTHN_RP_NAME / WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN

export const MAX_PASSKEYS = 5 // 每账户最多绑定数量

export interface StoredPasskey {
  id: string // credentialId（base64url）
  publicKey: string // 公钥（base64url）
  counter: number
  name?: string // 可识别名称（由 User-Agent 自动生成，如 "Chrome on macOS"）
  transports?: string[]
  deviceType?: string // singleDevice | multiDevice
  backedUp?: boolean
  createdAt: string // YYYY-MM-DD HH:mm（东八区）
}

// 由 User-Agent 生成可识别的设备名（浏览器 + 系统）
export function describeUserAgent(ua: string): string {
  let os = 'Unknown device'
  if (/iphone/i.test(ua)) os = 'iPhone'
  else if (/ipad/i.test(ua)) os = 'iPad'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Browser'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/safari/i.test(ua)) browser = 'Safari'

  return `${browser} on ${os}`
}

export function rpConfig(event: H3Event) {
  const url = getRequestURL(event)
  return {
    rpID: process.env.WEBAUTHN_RP_ID || url.hostname,
    rpName: process.env.WEBAUTHN_RP_NAME || 'MICROPUE BITS',
    origin: process.env.WEBAUTHN_ORIGIN || url.origin
  }
}

export function normalizePasskeys(value: unknown): StoredPasskey[] {
  if (Array.isArray(value)) return value as StoredPasskey[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as StoredPasskey[]) : []
    } catch {
      return []
    }
  }
  return []
}

// 与数据库时间格式一致：YYYY-MM-DD HH:mm:ss（东八区）
export function nowString(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

export async function savePasskeys(uuid: string, passkeys: StoredPasskey[]) {
  await useDb().execute('UPDATE `users` SET `passkeys` = ? WHERE `uuid` = ?', [JSON.stringify(passkeys), uuid])
}
