import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { nowString } from './webauthn'

// 恢复码：用户丢失验证器 / Passkey 时绕过第二因子的一次性凭据
// 生成 10 个 XXXXX-XXXXX（去易混字符），仅在生成时明文展示一次；数据库只存 SHA-256 哈希

export const RECOVERY_CODE_COUNT = 10

// 去掉 0/O/1/I/L 等易混字符
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export interface RecoveryCodeEntry {
  hash: string
  usedAt: string | null
}

function randomCode(): string {
  const bytes = randomBytes(10)
  let s = ''
  for (let i = 0; i < 10; i++) s += ALPHABET[bytes[i]! % ALPHABET.length]
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

function hashCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

export function generateRecoveryCodes(): { plain: string[]; entries: RecoveryCodeEntry[] } {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, randomCode)
  return { plain, entries: plain.map(c => ({ hash: hashCode(c), usedAt: null })) }
}

export function normalizeRecoveryCodes(value: unknown): RecoveryCodeEntry[] {
  if (Array.isArray(value)) return value as RecoveryCodeEntry[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as RecoveryCodeEntry[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function countUnusedRecoveryCodes(entries: RecoveryCodeEntry[]): number {
  return entries.filter(e => !e.usedAt).length
}

// 校验并消费一个恢复码（标记 usedAt）；命中返回更新后的数组
export function consumeRecoveryCode(
  entries: RecoveryCodeEntry[],
  code: string
): { ok: boolean; entries: RecoveryCodeEntry[] } {
  const target = Buffer.from(hashCode(code))
  const idx = entries.findIndex(e => !e.usedAt && timingSafeEqual(Buffer.from(e.hash), target))
  if (idx === -1) return { ok: false, entries }
  const next = entries.map((e, i) => (i === idx ? { ...e, usedAt: nowString() } : e))
  return { ok: true, entries: next }
}
