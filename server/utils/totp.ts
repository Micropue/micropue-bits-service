import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

// TOTP（Authenticator App）辅助：密钥生成、otpauth URI、二维码、动态码校验
// 兼容微软 / Google Authenticator：SHA1 / 6 位 / 30 秒

export function totpIssuer(): string {
  return process.env.TOTP_ISSUER || 'BITS'
}

// 生成 base32 密钥（20 字节 / 160 bit）
export function newTotpSecret(): string {
  return generateSecret()
}

// otpauth:// URI（account 作为 label，形如 BITS:username）
export function totpUri(account: string, secret: string): string {
  return generateURI({ issuer: totpIssuer(), label: account, secret, algorithm: 'sha1', digits: 6, period: 30 })
}

// 二维码 PNG data URL（服务端生成，密钥不外发到前端库）
export function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 })
}

// 校验动态码；afterTimeStep 用于防重放（拒绝 <= 已用时间步），返回命中的时间步
export async function verifyTotp(
  secret: string,
  token: string,
  afterTimeStep?: number
): Promise<{ valid: true; timeStep: number } | { valid: false }> {
  const res = await verify({ secret, token, epochTolerance: 1, afterTimeStep })
  return res.valid ? { valid: true, timeStep: res.timeStep } : { valid: false }
}
