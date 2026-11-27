import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { MAX_DEVELOPER_API_KEYS } from '#shared/utils/developer'
import { useDb } from './db'
import { shortId } from './id'
import { enforceRateLimit } from './rateLimit'

export const API_KEY_PREFIX = 'bits_sk_'
export const API_KEY_PERMISSIONS = [
  'content:read',
  'content:create',
  'content:update',
  'content:delete'
] as const

export type ApiKeyPermission = typeof API_KEY_PERMISSIONS[number]

const MAX_INACTIVE_KEYS = 50
const INACTIVE_KEY_RETENTION_DAYS = 30
const MAX_EXPIRY_DAYS = 3650
const INVALID_AUTH_LIMIT = 30
const INVALID_AUTH_WINDOW = 60
const PERMISSION_SET = new Set<string>(API_KEY_PERMISSIONS)

export interface ApiKeyUser {
  uuid: string
  email: string
  username: string
  nickname: string
}

export interface ApiKeyAuth {
  keySid: string
  keyName: string
  permissions: ApiKeyPermission[]
  expiresAt: string | null
  lastUsedAt: string | null
  user: ApiKeyUser
}

export interface DeveloperApiKey {
  sid: string
  name: string
  keyPrefix: string
  permissions: ApiKeyPermission[]
  expiresAt: string | null
  status: 'active' | 'expired'
  lastUsedAt: string | null
  createdAt: string
}

interface ApiKeyRow extends RowDataPacket {
  sid: string
  user_uuid: string
  name: string
  key_prefix: string
  key_hash: string
  permissions: unknown
  expires_at: string | null
  key_status: 'active' | 'expired'
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
  user_username: string
  user_email: string
  user_nickname: string
  user_status: string
}

const KEY_COLUMNS = `k.\`sid\`, k.\`user_uuid\`, k.\`name\`, k.\`key_prefix\`,
  k.\`key_hash\`, k.\`permissions\`, k.\`expires_at\`, k.\`last_used_at\`, k.\`revoked_at\`,
  CASE WHEN k.\`expires_at\` IS NOT NULL AND k.\`expires_at\` <= NOW()
    THEN 'expired' ELSE 'active' END AS \`key_status\`,
  k.\`created_at\`, u.\`username\` AS \`user_username\`,
  u.\`email\` AS \`user_email\`, u.\`nickname\` AS \`user_nickname\`, u.\`status\` AS \`user_status\``

function parsePermissions(value: unknown): ApiKeyPermission[] {
  let list: unknown = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return []
  return [...new Set(list.map(item => String(item)).filter((item): item is ApiKeyPermission => PERMISSION_SET.has(item)))]
}

function publicApiKey(row: ApiKeyRow): DeveloperApiKey {
  return {
    sid: row.sid,
    name: row.name,
    keyPrefix: row.key_prefix,
    permissions: parsePermissions(row.permissions),
    expiresAt: row.expires_at,
    status: row.key_status,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at
  }
}

function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

function readApiKey(event: H3Event): string {
  const authorization = getRequestHeader(event, 'authorization')?.trim() ?? ''
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() ?? ''
  const headerKey = getRequestHeader(event, 'x-api-key')?.trim() ?? ''
  return bearer || headerKey
}

async function enforceInvalidAuthLimit(event: H3Event) {
  await enforceRateLimit(event, {
    bucket: 'api-v1:invalid-auth',
    identity: `ip:${getClientIp(event)}`,
    limit: INVALID_AUTH_LIMIT,
    window: INVALID_AUTH_WINDOW,
    failOpen: false,
    message: 'Too many invalid API key attempts (30 per minute)'
  })
}

// 开放 API 只接受 API Key，不接受站点 Cookie 或 OAuth token。
// Key 属于账号，不依赖任何 App；删除 App 不会影响已签发的 Key。
export async function authenticateApiKey(event: H3Event): Promise<ApiKeyAuth> {
  const rawKey = readApiKey(event)
  if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
    await enforceInvalidAuthLimit(event)
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="BITS API"')
    throw createError({
      statusCode: 401,
      statusMessage: 'A valid API key is required',
      data: { code: 'API_KEY_REQUIRED' }
    })
  }

  const [rows] = await useDb().query<ApiKeyRow[]>(
    `SELECT ${KEY_COLUMNS}
       FROM \`developer_api_keys\` k
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`key_hash\` = ?
        AND k.\`revoked_at\` IS NULL
        AND (k.\`expires_at\` IS NULL OR k.\`expires_at\` > NOW())
      LIMIT 1`,
    [hashApiKey(rawKey)]
  )
  const row = rows[0]
  if (!row) {
    await enforceInvalidAuthLimit(event)
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="BITS API", error="invalid_token"')
    throw createError({
      statusCode: 401,
      statusMessage: 'The API key is invalid or has expired',
      data: { code: 'API_KEY_INVALID' }
    })
  }
  if (row.user_status !== 'normal') {
    await enforceInvalidAuthLimit(event)
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="BITS API", error="invalid_token"')
    throw createError({ statusCode: 403, statusMessage: 'The account is disabled', data: { code: 'ACCOUNT_DISABLED' } })
  }

  // last_used_at 仅做分钟级更新，避免每个读请求都产生一次写入。
  await useDb().execute(
    `UPDATE \`developer_api_keys\`
        SET \`last_used_at\` = NOW()
      WHERE \`sid\` = ?
        AND (\`last_used_at\` IS NULL OR \`last_used_at\` < NOW() - INTERVAL 60 SECOND)`,
    [row.sid]
  )

  return {
    keySid: row.sid,
    keyName: row.name,
    permissions: parsePermissions(row.permissions),
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    user: {
      uuid: row.user_uuid,
      email: row.user_email,
      username: row.user_username,
      nickname: row.user_nickname
    }
  }
}

export function requireApiKeyPermission(auth: ApiKeyAuth, permission: ApiKeyPermission) {
  if (auth.permissions.includes(permission)) return
  throw createError({
    statusCode: 403,
    statusMessage: `This API key does not have the ${permission} permission`,
    data: { code: 'API_KEY_PERMISSION_REQUIRED', requiredPermission: permission }
  })
}

export interface ApiKeyPage {
  apiKeys: DeveloperApiKey[]
  total: number
  activeTotal: number
  page: number
  pageSize: number
  pageCount: number
  hasMore: boolean
}

export async function listApiKeys(userUuid: string, requestedPage = 1): Promise<ApiKeyPage> {
  const pageSize = 20
  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\`,
            COALESCE(SUM(CASE
              WHEN k.\`expires_at\` IS NULL OR k.\`expires_at\` > NOW() THEN 1
              ELSE 0
            END), 0) AS \`active_total\`
       FROM \`developer_api_keys\` k
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`user_uuid\` = ? AND k.\`revoked_at\` IS NULL`,
    [userUuid]
  )
  const total = Number(countRow?.total ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount)
  const offset = (page - 1) * pageSize
  const [rows] = await useDb().query<ApiKeyRow[]>(
    `SELECT ${KEY_COLUMNS}
       FROM \`developer_api_keys\` k
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`user_uuid\` = ? AND k.\`revoked_at\` IS NULL
      ORDER BY k.\`created_at\` DESC, k.\`sid\` DESC
      LIMIT ? OFFSET ?`,
    [userUuid, pageSize, offset]
  )
  return {
    apiKeys: rows.map(publicApiKey),
    total,
    activeTotal: Number(countRow?.active_total ?? 0),
    page,
    pageSize,
    pageCount,
    hasMore: offset + rows.length < total
  }
}

async function pruneApiKeyHistory(conn: PoolConnection, userUuid: string) {
  // Revoked and expired records are not usable. Keep a bounded recent history so
  // repeated create/revoke cycles cannot grow the table without limit.
  await conn.execute(
    `DELETE FROM \`developer_api_keys\`
      WHERE \`user_uuid\` = ?
        AND (
          (\`revoked_at\` IS NOT NULL AND \`revoked_at\` <= NOW() - INTERVAL ${INACTIVE_KEY_RETENTION_DAYS} DAY)
          OR (\`expires_at\` IS NOT NULL AND \`expires_at\` <= NOW() - INTERVAL ${INACTIVE_KEY_RETENTION_DAYS} DAY)
        )`,
    [userUuid]
  )

  const inactiveWhere = `\`user_uuid\` = ?
    AND (\`revoked_at\` IS NOT NULL OR (\`expires_at\` IS NOT NULL AND \`expires_at\` <= NOW()))`
  const [[countRow]] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`developer_api_keys\` WHERE ${inactiveWhere}`,
    [userUuid]
  )
  const excess = Math.min(
    Math.max(Number(countRow?.total ?? 0) - MAX_INACTIVE_KEYS, 0),
    1000
  )
  if (!excess) return

  const [staleRows] = await conn.query<RowDataPacket[]>(
    `SELECT \`sid\` FROM \`developer_api_keys\`
      WHERE ${inactiveWhere}
      ORDER BY COALESCE(\`revoked_at\`, \`expires_at\`, \`created_at\`) DESC, \`sid\` DESC
      LIMIT ? OFFSET ?`,
    [userUuid, excess, MAX_INACTIVE_KEYS]
  )
  if (!staleRows.length) return
  await conn.execute(
    `DELETE FROM \`developer_api_keys\`
      WHERE \`user_uuid\` = ? AND \`sid\` IN (${staleRows.map(() => '?').join(', ')})`,
    [userUuid, ...staleRows.map(row => String(row.sid))]
  )
}

export async function createApiKey(
  userUuid: string,
  input: {
    name: string
    permissions: ApiKeyPermission[]
    expiresInDays: number | null
  }
): Promise<{ apiKey: DeveloperApiKey, key: string }> {
  const sid = shortId()
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  const keyPrefix = key.slice(0, 24)
  const expiresAt = input.expiresInDays === null
    ? null
    : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    // Serialize creation for one account so concurrent requests cannot exceed the
    // active-key cap or race the history cleanup.
    await conn.execute('SELECT `uuid` FROM `users` WHERE `uuid` = ? FOR UPDATE', [userUuid])
    await pruneApiKeyHistory(conn, userUuid)

    const [[countRow]] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS \`total\`
         FROM \`developer_api_keys\`
        WHERE \`user_uuid\` = ? AND \`revoked_at\` IS NULL
          AND (\`expires_at\` IS NULL OR \`expires_at\` > NOW())`,
      [userUuid]
    )
    if (Number(countRow?.total ?? 0) >= MAX_DEVELOPER_API_KEYS) {
      throw createError({
        statusCode: 409,
        statusMessage: `You can have at most ${MAX_DEVELOPER_API_KEYS} active API keys`
      })
    }

    await conn.execute(
      `INSERT INTO \`developer_api_keys\`
         (\`sid\`, \`user_uuid\`, \`name\`, \`key_prefix\`, \`key_hash\`, \`permissions\`, \`expires_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sid, userUuid, input.name, keyPrefix, hashApiKey(key), JSON.stringify(input.permissions), expiresAt]
    )
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }

  const [rows] = await useDb().query<ApiKeyRow[]>(
    `SELECT ${KEY_COLUMNS}
       FROM \`developer_api_keys\` k
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`sid\` = ? AND k.\`user_uuid\` = ?
      LIMIT 1`,
    [sid, userUuid]
  )
  return { apiKey: publicApiKey(rows[0]!), key }
}

export function readApiKeyInput(body: Record<string, unknown>) {
  const name = String(body?.name ?? '').trim()
  if (!name || name.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: 'API key name is required (80 characters or less)',
      data: { field: 'name' }
    })
  }

  const rawPermissions = Array.isArray(body?.permissions) ? body.permissions : []
  const requestedPermissions = [...new Set(rawPermissions.map(item => String(item)))]
  if (requestedPermissions.some(item => !PERMISSION_SET.has(item))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Permissions contain an unknown value',
      data: { field: 'permissions' }
    })
  }
  const permissions = requestedPermissions as ApiKeyPermission[]
  if (!permissions.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Choose at least one valid permission',
      data: { field: 'permissions' }
    })
  }

  let expiresInDays: number | null = null
  const rawExpiry = body?.expiresInDays
  if (rawExpiry !== null && rawExpiry !== undefined && rawExpiry !== 'never') {
    const days = Number(rawExpiry)
    if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
      throw createError({
        statusCode: 400,
        statusMessage: `Expiry must be between 1 and ${MAX_EXPIRY_DAYS} days, or never`,
        data: { field: 'expiresInDays' }
      })
    }
    expiresInDays = days
  }

  return { name, permissions, expiresInDays }
}

export async function revokeApiKey(userUuid: string, sid: string): Promise<boolean> {
  const [result] = await useDb().execute<{ affectedRows: number }>(
    `UPDATE \`developer_api_keys\`
        SET \`revoked_at\` = NOW()
      WHERE \`sid\` = ? AND \`user_uuid\` = ? AND \`revoked_at\` IS NULL`,
    [sid, userUuid]
  )
  return Number(result.affectedRows ?? 0) > 0
}
