import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// 敏感字段静态加密（AuthApp/TOTP 密钥等）：AES-256-GCM
// 密钥取 .env 的 TOTP_ENC_KEY（32 字节，base64 或 64 位 hex），密文格式：iv:tag:ciphertext（均为 base64）
// 规范详见 项目综合设计.md「登录安全」

function encKey(): Buffer {
  const raw = process.env.TOTP_ENC_KEY
  if (!raw) throw new Error('TOTP_ENC_KEY 未配置（.env）')
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('TOTP_ENC_KEY 必须为 32 字节（base64 或 64 位 hex）')
  return buf
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ct].map(b => b.toString('base64')).join(':')
}

export function decryptSecret(payload: string): string {
  const [ivB, tagB, ctB] = payload.split(':')
  if (!ivB || !tagB || !ctB) throw new Error('Invalid encrypted payload')
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]).toString('utf8')
}
