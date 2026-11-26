import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2/promise'
import { useDb } from './db'
import { shortId } from './id'

export const API_KEY_PREFIX = 'bits_sk_'
export const API_KEY_PERMISSIONS = [
  'content:read',
  'content:create',
  'content:update',
  'content:delete'
] as const

export type ApiKeyPermission = typeof API_KEY_PERMISSIONS[number]

const MAX_ACTIVE_KEYS = 50
const MAX_EXPIRY_DAYS = 3650
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
  app: {
    sid: string
    name: string
    appType: 'website' | 'service'
  }
  user: ApiKeyUser
}

export interface DeveloperApiKey {
  sid: string
  name: string
  appSid: string
  appName: string
  appType: 'website' | 'service'
  keyPrefix: string
  permissions: ApiKeyPermission[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

interface ApiKeyRow extends RowDataPacket {
  sid: string
  user_uuid: string
  app_sid: string
  name: string
  key_prefix: string
  key_hash: string
  permissions: unknown
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
  app_name: string
  app_type: 'website' | 'service'
  app_status: string
  user_username: string
  user_email: string
  user_nickname: string
  user_status: string
}

const KEY_COLUMNS = `k.\`sid\`, k.\`user_uuid\`, k.\`app_sid\`, k.\`name\`, k.\`key_prefix\`,
  k.\`key_hash\`, k.\`permissions\`, k.\`expires_at\`, k.\`last_used_at\`, k.\`revoked_at\`,
  k.\`created_at\`, a.\`name\` AS \`app_name\`, a.\`app_type\`, a.\`status\` AS \`app_status\`,
  u.\`username\` AS \`user_username\`, u.\`email\` AS \`user_email\`,
  u.\`nickname\` AS \`user_nickname\`, u.\`status\` AS \`user_status\``

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
    appSid: row.app_sid,
    appName: row.app_name,
    appType: row.app_type,
    keyPrefix: row.key_prefix,
    permissions: parsePermissions(row.permissions),
    expiresAt: row.expires_at,
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

// 开放 API 只接受 API Key，不接受站点 Cookie 或 OAuth token
export async function authenticateApiKey(event: H3Event): Promise<ApiKeyAuth> {
  const rawKey = readApiKey(event)
  if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
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
       JOIN \`developer_apps\` a ON a.\`sid\` = k.\`app_sid\`
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`key_hash\` = ?
        AND k.\`revoked_at\` IS NULL
        AND (k.\`expires_at\` IS NULL OR k.\`expires_at\` > NOW())
      LIMIT 1`,
    [hashApiKey(rawKey)]
  )
  const row = rows[0]
  if (!row) {
    setResponseHeader(event, 'WWW-Authenticate', 'Bearer realm="BITS API", error="invalid_token"')
    throw createError({
      statusCode: 401,
      statusMessage: 'The API key is invalid or has expired',
      data: { code: 'API_KEY_INVALID' }
    })
  }
  if (row.app_status !== 'active') {
    throw createError({ statusCode: 403, statusMessage: 'The application is suspended', data: { code: 'APP_SUSPENDED' } })
  }
  if (row.user_status !== 'normal') {
    throw createError({ statusCode: 403, statusMessage: 'The account is disabled', data: { code: 'ACCOUNT_DISABLED' } })
  }

  // last_used_at 仅做分钟级更新，避免每个读请求都产生一次写入
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
    app: {
      sid: row.app_sid,
      name: row.app_name,
      appType: row.app_type
    },
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

export async function listApiKeys(userUuid: string): Promise<{ apiKeys: DeveloperApiKey[], total: number }> {
  const [rows] = await useDb().query<ApiKeyRow[]>(
    `SELECT ${KEY_COLUMNS}
       FROM \`developer_api_keys\` k
       JOIN \`developer_apps\` a ON a.\`sid\` = k.\`app_sid\`
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`user_uuid\` = ? AND k.\`revoked_at\` IS NULL
      ORDER BY k.\`created_at\` DESC, k.\`sid\` DESC`,
    [userUuid]
  )
  return { apiKeys: rows.map(publicApiKey), total: rows.length }
}

export async function createApiKey(
  userUuid: string,
  input: {
    appSid: string
    name: string
    permissions: ApiKeyPermission[]
    expiresInDays: number | null
  }
): Promise<{ apiKey: DeveloperApiKey, key: string }> {
  const [apps] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid` FROM `developer_apps` WHERE `sid` = ? AND `user_uuid` = ? AND `status` = 'active' LIMIT 1",
    [input.appSid, userUuid]
  )
  if (!apps[0]) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an active App you own', data: { field: 'appSid' } })
  }

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    'SELECT COUNT(*) AS `total` FROM `developer_api_keys` WHERE `user_uuid` = ? AND `revoked_at` IS NULL',
    [userUuid]
  )
  if (Number(countRow?.total ?? 0) >= MAX_ACTIVE_KEYS) {
    throw createError({
      statusCode: 409,
      statusMessage: `You can have at most ${MAX_ACTIVE_KEYS} active API keys`
    })
  }

  const sid = shortId()
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  const keyPrefix = key.slice(0, 24)
  if (input.expiresInDays === null) {
    await useDb().execute(
      `INSERT INTO \`developer_api_keys\`
         (\`sid\`, \`user_uuid\`, \`app_sid\`, \`name\`, \`key_prefix\`, \`key_hash\`, \`permissions\`, \`expires_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      [sid, userUuid, input.appSid, input.name, keyPrefix, hashApiKey(key), JSON.stringify(input.permissions)]
    )
  } else {
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    await useDb().execute(
      `INSERT INTO \`developer_api_keys\`
         (\`sid\`, \`user_uuid\`, \`app_sid\`, \`name\`, \`key_prefix\`, \`key_hash\`, \`permissions\`, \`expires_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sid, userUuid, input.appSid, input.name, keyPrefix, hashApiKey(key), JSON.stringify(input.permissions), expiresAt]
    )
  }

  const [rows] = await useDb().query<ApiKeyRow[]>(
    `SELECT ${KEY_COLUMNS}
       FROM \`developer_api_keys\` k
       JOIN \`developer_apps\` a ON a.\`sid\` = k.\`app_sid\`
       JOIN \`users\` u ON u.\`uuid\` = k.\`user_uuid\`
      WHERE k.\`sid\` = ? AND k.\`user_uuid\` = ?
      LIMIT 1`,
    [sid, userUuid]
  )
  return { apiKey: publicApiKey(rows[0]!), key }
}

export function readApiKeyInput(body: Record<string, unknown>) {
  const appSid = String(body?.appSid ?? '').trim()
  const name = String(body?.name ?? '').trim()
  if (!appSid) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an App', data: { field: 'appSid' } })
  }
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

  return { appSid, name, permissions, expiresInDays }
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
