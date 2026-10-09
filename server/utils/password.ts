import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

// scrypt 参数（Node 默认 N=16384, r=8, p=1，内存约 16MB）
const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16

// 存储格式：scrypt$N$r$p$saltBase64$hashBase64（带参数，便于将来迁移算法）
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH)
  const derived = (await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P })) as Buffer
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = parts
  const salt = Buffer.from(saltB64, 'base64')
  const expected = Buffer.from(hashB64, 'base64')
  const derived = (await scryptAsync(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  })) as Buffer
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
