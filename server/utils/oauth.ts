import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { AuthUser } from './auth'
import type { DeveloperApp } from './developer'
import { useDb } from './db'
import { shortId } from './id'
import { useRedis } from './redis'

// Bits OAuth 2.0：scope、客户端认证、授权码/令牌签发辅助
// 授权码与设备流临时数据存 Redis，access/refresh token 只存 SHA-256 哈希

export const OAUTH_SCOPES: Record<string, string> = {
  'read:user': 'Read your basic profile',
  'read:email': 'Read your email address'
}

export const DEFAULT_SCOPE = 'read:user'
const ACCESS_TOKEN_SECONDS = 3600
const REFRESH_TOKEN_SECONDS = 30 * 24 * 3600
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
export const MAX_REDIRECT_URIS = 10

// 用户授权 OAuth 应用前必须已设置用户名和密码（不要求开发者中心的 2FA）
export function assertOAuthAccountReady(user: AuthUser) {
  const missing: string[] = []
  if (user.username === user.email) missing.push('username')
  if (!user.password_hash) missing.push('password')
  if (missing.length) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Set a username and password before authorizing applications',
      data: { code: 'OAUTH_SETUP_REQUIRED', missing }
    })
  }
}

export interface OAuthServiceInput {
  redirectUris: string[]
  allowWildcard: boolean
  deviceFlow: boolean
  expireUserTokens: boolean
}

export interface DeveloperOAuthService {
  appSid: string
  clientId: string
  name: string
  homepageUrl: string
  iconUrl: string | null
  description: string
  redirectUris: string[]
  allowWildcard: boolean
  deviceFlow: boolean
  expireUserTokens: boolean
  status: string
  createdAt: string
}

export interface DeveloperOAuthServiceWithSecret extends DeveloperOAuthService {
  clientSecret: string
}

interface OAuthServiceRow extends RowDataPacket {
  app_sid: string
  user_uuid: string
  client_secret_hash: string | null
  status: string
  app_status: string
  redirect_uris: unknown
  allow_wildcard: number
  device_flow: number
  expire_user_tokens: number
  created_at: string
  name: string
  homepage_url: string
  icon_url: string | null
  description: string
}

export interface OAuthAppRow extends RowDataPacket {
  sid: string
  name: string
  homepage_url: string
  icon_url: string | null
  description: string
  owner_username: string | null
  owner_nickname: string | null
  client_secret_hash: string | null
  redirect_uris: unknown
  allow_wildcard: number
  device_flow: number
  expire_user_tokens: number
}

export interface OAuthCodeSession {
  appSid: string
  userUuid: string
  redirectUri: string
  scope: string
  codeChallenge?: string
  codeChallengeMethod?: string
}

export interface OAuthDeviceSession {
  appSid: string
  scope: string
  status: 'pending' | 'approved' | 'denied'
  userUuid: string | null
  userCode: string
  interval: number
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function generateUserCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let value = ''
  for (let index = 0; index < 8; index++) value += alphabet[randomBytes(1)[0]! % alphabet.length]
  return `${value.slice(0, 4)}-${value.slice(4)}`
}

export function normalizeUserCode(value: unknown): string {
  const raw = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function parseOAuthScope(raw: unknown): string {
  const values = String(raw ?? '').split(/[\s,]+/).map(value => value.trim()).filter(Boolean)
  const scopes = values.length ? [...new Set(values)] : [DEFAULT_SCOPE]
  for (const scope of scopes) {
    if (!OAUTH_SCOPES[scope]) throw createError({ statusCode: 400, statusMessage: `Unknown scope: ${scope}` })
  }
  return scopes.join(' ')
}

export function scopeList(scope: string): string[] {
  return scope.split(/\s+/).filter(Boolean)
}

export function normalizeRedirectUris(value: unknown): string[] {
  let list: unknown = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      list = []
    }
  }
  if (!Array.isArray(list)) return []
  return [...new Set(list.map(item => String(item).trim()).filter(Boolean))]
}

function isLocalHost(hostname: string) {
  return LOCAL_HOSTS.has(hostname.toLowerCase())
}

export function isSecureOAuthRedirectUri(uri: string): boolean {
  if (uri.includes('*') || uri.includes('#')) return false
  try {
    const url = new URL(uri)
    if (url.username || url.password) return false
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && isLocalHost(url.hostname)
  } catch {
    return false
  }
}

export function validateOAuthRedirectUri(uri: string, allowWildcard: boolean): string | null {
  if (!uri || uri.length > 512) return 'Redirect URIs must be 512 characters or less'
  if (!uri.includes('*')) {
    if (!isSecureOAuthRedirectUri(uri)) {
      return 'Redirect URIs must use HTTPS (HTTP is only allowed for localhost)'
    }
    return null
  }
  if (!allowWildcard) return 'Enable wildcard matching before using * in redirect URIs'

  const match = /^(https?):\/\/([^/?#]+)([^?#]*)(\?[^#]*)?$/i.exec(uri)
  if (!match) return 'Wildcard redirect URI format is invalid'
  const [, protocol, authority, path = '', query = ''] = match
  if (protocol.toLowerCase() !== 'https') return 'Wildcard redirect URIs must use HTTPS'
  if (authority.includes('@') || path.includes('#') || query.includes('*')) {
    return 'Wildcard redirect URI format is invalid'
  }

  const hostWithPort = authority
  const host = hostWithPort.replace(/:\d+$/, '')
  if (host.includes('*')) {
    if (!host.startsWith('*.') || host.slice(2).includes('*')) {
      return 'Wildcard is only allowed as a leading subdomain label'
    }
    const base = host.slice(2)
    if (!/^[A-Za-z0-9.-]+$/.test(base) || base.startsWith('.') || base.endsWith('.')) {
      return 'Wildcard redirect URI domain is invalid'
    }
  } else if (!/^[A-Za-z0-9.-]+$/.test(host)) {
    return 'Wildcard redirect URI domain is invalid'
  }
  return null
}

export function readOAuthServiceInput(body: Record<string, unknown>): OAuthServiceInput {
  const allowWildcard = body.allowWildcard === true
  const deviceFlow = body.deviceFlow === true
  const expireUserTokens = body.expireUserTokens !== false
  const redirectUris = normalizeRedirectUris(body.redirectUris)

  if (!redirectUris.length || redirectUris.length > MAX_REDIRECT_URIS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Add between 1 and ${MAX_REDIRECT_URIS} redirect URIs`,
      data: { field: 'redirectUris' }
    })
  }
  const invalidRedirect = redirectUris.map(uri => validateOAuthRedirectUri(uri, allowWildcard)).find(Boolean)
  if (invalidRedirect) {
    throw createError({
      statusCode: 400,
      statusMessage: invalidRedirect,
      data: { field: 'redirectUris' }
    })
  }

  return { redirectUris, allowWildcard, deviceFlow, expireUserTokens }
}

export function redirectUriAllowed(redirectUris: string[], allowWildcard: boolean, uri: string): boolean {
  if (redirectUris.includes(uri)) return true
  if (!allowWildcard) return false
  return redirectUris.some(pattern => {
    if (!pattern.includes('*')) return pattern === uri
    const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
    return regex.test(uri)
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function publicOAuthService(row: OAuthServiceRow): DeveloperOAuthService {
  return {
    appSid: row.app_sid,
    clientId: row.app_sid,
    name: row.name,
    homepageUrl: row.homepage_url,
    iconUrl: row.icon_url,
    description: row.description,
    redirectUris: normalizeRedirectUris(row.redirect_uris),
    allowWildcard: !!row.allow_wildcard,
    deviceFlow: !!row.device_flow,
    expireUserTokens: !!row.expire_user_tokens,
    status: row.status === 'active' && row.app_status === 'active' ? 'active' : 'suspended',
    createdAt: row.created_at
  }
}

const SERVICE_COLUMNS = `s.\`app_sid\`, s.\`user_uuid\`, s.\`client_secret_hash\`, s.\`redirect_uris\`,
  s.\`allow_wildcard\`, s.\`device_flow\`, s.\`expire_user_tokens\`, s.\`status\`, s.\`created_at\`,
  a.\`name\`, a.\`homepage_url\`, a.\`icon_url\`, a.\`description\`, a.\`status\` AS \`app_status\``

export async function listOAuthServices(userUuid: string): Promise<DeveloperOAuthService[]> {
  const [rows] = await useDb().query<OAuthServiceRow[]>(
    `SELECT ${SERVICE_COLUMNS}
       FROM \`developer_oauth_services\` s
       JOIN \`developer_apps\` a ON a.\`sid\` = s.\`app_sid\`
      WHERE s.\`user_uuid\` = ?
      ORDER BY s.\`created_at\` DESC`,
    [userUuid]
  )
  return rows.map(publicOAuthService)
}

export async function listAvailableApps(userUuid: string): Promise<DeveloperApp[]> {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT a.\`sid\`, a.\`name\`, a.\`homepage_url\`, a.\`icon_url\`, a.\`description\`, a.\`created_at\`
       FROM \`developer_apps\` a
       LEFT JOIN \`developer_oauth_services\` s ON s.\`app_sid\` = a.\`sid\`
      WHERE a.\`user_uuid\` = ? AND a.\`status\` = 'active' AND s.\`app_sid\` IS NULL
      ORDER BY a.\`created_at\` DESC`,
    [userUuid]
  )
  return rows.map(row => ({
    sid: String(row.sid),
    name: String(row.name),
    homepageUrl: String(row.homepage_url),
    iconUrl: row.icon_url ? String(row.icon_url) : null,
    description: String(row.description),
    createdAt: String(row.created_at)
  }))
}

export async function getOAuthServiceDetail(
  userUuid: string,
  appSid: string
): Promise<DeveloperOAuthService | null> {
  const [rows] = await useDb().query<OAuthServiceRow[]>(
    `SELECT ${SERVICE_COLUMNS}
       FROM \`developer_oauth_services\` s
       JOIN \`developer_apps\` a ON a.\`sid\` = s.\`app_sid\`
      WHERE s.\`app_sid\` = ? AND s.\`user_uuid\` = ?
      LIMIT 1`,
    [appSid, userUuid]
  )
  return rows[0] ? publicOAuthService(rows[0]) : null
}

export async function createOAuthService(
  userUuid: string,
  appSid: string,
  input: OAuthServiceInput
): Promise<DeveloperOAuthServiceWithSecret> {
  const [apps] = await useDb().query<RowDataPacket[]>(
    "SELECT \`sid\` FROM \`developer_apps\` WHERE \`sid\` = ? AND \`user_uuid\` = ? AND \`status\` = 'active' LIMIT 1",
    [appSid, userUuid]
  )
  if (!apps[0]) throw createError({ statusCode: 404, statusMessage: 'Application not found' })

  const [existing] = await useDb().query<RowDataPacket[]>(
    'SELECT `app_sid` FROM `developer_oauth_services` WHERE `app_sid` = ? LIMIT 1',
    [appSid]
  )
  if (existing[0]) {
    throw createError({ statusCode: 409, statusMessage: 'This app already has an OAuth service' })
  }

  const secret = randomToken(32)
  await useDb().execute(
    `INSERT INTO \`developer_oauth_services\`
      (\`app_sid\`, \`user_uuid\`, \`client_secret_hash\`, \`redirect_uris\`, \`allow_wildcard\`, \`device_flow\`, \`expire_user_tokens\`)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      appSid, userUuid, hashToken(secret), JSON.stringify(input.redirectUris),
      input.allowWildcard ? 1 : 0, input.deviceFlow ? 1 : 0, input.expireUserTokens ? 1 : 0
    ]
  )
  const service = await getOAuthServiceDetail(userUuid, appSid)
  if (!service) throw createError({ statusCode: 500, statusMessage: 'Failed to load OAuth service' })
  return { ...service, clientSecret: secret }
}

export async function updateOAuthService(
  userUuid: string,
  appSid: string,
  input: OAuthServiceInput
): Promise<DeveloperOAuthService | null> {
  const [existing] = await useDb().query<RowDataPacket[]>(
    'SELECT `app_sid` FROM `developer_oauth_services` WHERE `app_sid` = ? AND `user_uuid` = ? LIMIT 1',
    [appSid, userUuid]
  )
  if (!existing[0]) return null

  await useDb().execute(
    `UPDATE \`developer_oauth_services\`
        SET \`redirect_uris\` = ?, \`allow_wildcard\` = ?, \`device_flow\` = ?, \`expire_user_tokens\` = ?
      WHERE \`app_sid\` = ? AND \`user_uuid\` = ?`,
    [
      JSON.stringify(input.redirectUris), input.allowWildcard ? 1 : 0,
      input.deviceFlow ? 1 : 0, input.expireUserTokens ? 1 : 0, appSid, userUuid
    ]
  )
  return await getOAuthServiceDetail(userUuid, appSid)
}

export async function resetOAuthServiceSecret(userUuid: string, appSid: string) {
  const [existing] = await useDb().query<RowDataPacket[]>(
    'SELECT `app_sid` FROM `developer_oauth_services` WHERE `app_sid` = ? AND `user_uuid` = ? LIMIT 1',
    [appSid, userUuid]
  )
  if (!existing[0]) return null
  const secret = randomToken(32)
  await useDb().execute(
    'UPDATE `developer_oauth_services` SET `client_secret_hash` = ? WHERE `app_sid` = ?',
    [hashToken(secret), appSid]
  )
  return { appSid, clientId: appSid, clientSecret: secret }
}

export async function fetchOAuthApp(clientId: string): Promise<OAuthAppRow | null> {
  const [rows] = await useDb().query<OAuthAppRow[]>(
    `SELECT s.\`app_sid\` AS \`sid\`, a.\`name\`, a.\`homepage_url\`, a.\`icon_url\`, a.\`description\`,
            u.\`username\` AS \`owner_username\`, u.\`nickname\` AS \`owner_nickname\`, s.\`client_secret_hash\`, s.\`redirect_uris\`, s.\`allow_wildcard\`, s.\`device_flow\`, s.\`expire_user_tokens\`
       FROM \`developer_oauth_services\` s
       JOIN \`developer_apps\` a ON a.\`sid\` = s.\`app_sid\`
       JOIN \`users\` u ON u.\`uuid\` = a.\`user_uuid\`
      WHERE s.\`app_sid\` = ? AND s.\`status\` = 'active' AND a.\`status\` = 'active'
      LIMIT 1`,
    [clientId]
  )
  return rows[0] ?? null
}

export function appRedirectUris(app: OAuthAppRow): string[] {
  return normalizeRedirectUris(app.redirect_uris)
}

function clientCredentials(event: H3Event, body: Record<string, unknown>) {
  let clientId = String(body.client_id ?? '').trim()
  let clientSecret = String(body.client_secret ?? '').trim()
  const header = getRequestHeader(event, 'authorization') ?? ''
  if (header.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
      const separator = decoded.indexOf(':')
      if (separator >= 0) {
        clientId = decoded.slice(0, separator)
        clientSecret = decoded.slice(separator + 1)
      }
    } catch {
      // 交给下面的 invalid_client 处理
    }
  }
  return { clientId, clientSecret }
}

export async function authenticateOAuthClient(
  event: H3Event,
  body: Record<string, unknown>
): Promise<OAuthAppRow | null> {
  const { clientId, clientSecret } = clientCredentials(event, body)
  if (!clientId || !clientSecret) return null
  const app = await fetchOAuthApp(clientId)
  if (!app?.client_secret_hash) return null
  const expected = Buffer.from(app.client_secret_hash, 'hex')
  const actual = Buffer.from(hashToken(clientSecret), 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  return app
}

export function verifyPkce(challenge: string, method: string, verifier: string): boolean {
  if (method === 'plain') return challenge === verifier
  if (method !== 'S256') return false
  return createHash('sha256').update(verifier).digest('base64url') === challenge
}

export function appendOAuthParams(uri: string, params: Record<string, string>): string {
  const url = new URL(uri)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

export async function issueOAuthTokens(
  app: OAuthAppRow,
  userUuid: string,
  scope: string,
  familyId?: string
) {
  const db = useDb()
  const family = familyId ?? shortId()
  const accessToken = randomToken()
  const accessSeconds = app.expire_user_tokens ? ACCESS_TOKEN_SECONDS : null

  await db.execute(
    `INSERT INTO \`oauth_tokens\`
      (\`sid\`, \`app_sid\`, \`user_uuid\`, \`family_id\`, \`token_hash\`, \`kind\`, \`scope\`, \`expires_at\`)
     VALUES (?, ?, ?, ?, ?, 'access', ?, IF(? IS NULL, NULL, DATE_ADD(NOW(), INTERVAL ? SECOND)))`,
    [shortId(), app.sid, userUuid, family, hashToken(accessToken), scope, accessSeconds, accessSeconds]
  )

  let refreshToken: string | undefined
  if (accessSeconds) {
    refreshToken = randomToken()
    await db.execute(
      `INSERT INTO \`oauth_tokens\`
        (\`sid\`, \`app_sid\`, \`user_uuid\`, \`family_id\`, \`token_hash\`, \`kind\`, \`scope\`, \`expires_at\`)
       VALUES (?, ?, ?, ?, ?, 'refresh', ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [shortId(), app.sid, userUuid, family, hashToken(refreshToken), scope, REFRESH_TOKEN_SECONDS]
    )
  }

  return {
    access_token: accessToken,
    token_type: 'bearer',
    ...(accessSeconds ? { expires_in: ACCESS_TOKEN_SECONDS } : {}),
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
    scope
  }
}

export async function findRefreshToken(token: string, appSid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT t.\`sid\`, t.\`user_uuid\`, t.\`scope\`, t.\`family_id\`, t.\`revoked_at\`, t.\`expires_at\`, (t.\`expires_at\` <= NOW()) AS \`expired\`,
            u.\`status\` AS \`user_status\`
       FROM \`oauth_tokens\` t
       JOIN \`users\` u ON u.\`uuid\` = t.\`user_uuid\`
      WHERE t.\`token_hash\` = ? AND t.\`app_sid\` = ? AND t.\`kind\` = 'refresh'
      LIMIT 1`,
    [hashToken(token), appSid]
  )
  return rows[0] ?? null
}

export async function claimRefreshToken(sid: string): Promise<boolean> {
  const [result] = await useDb().execute<ResultSetHeader>(
    'UPDATE `oauth_tokens` SET `revoked_at` = NOW() WHERE `sid` = ? AND `revoked_at` IS NULL',
    [sid]
  )
  return result.affectedRows === 1
}

export async function revokeTokenFamily(familyId: string) {
  await useDb().execute(
    'UPDATE `oauth_tokens` SET `revoked_at` = NOW() WHERE `family_id` = ? AND `revoked_at` IS NULL',
    [familyId]
  )
}

export async function findAccessToken(token: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT t.\`scope\`, u.\`uuid\`, u.\`email\`, u.\`username\`, u.\`nickname\`, u.\`github_id\`, u.\`status\`
       FROM \`oauth_tokens\` t
       JOIN \`users\` u ON u.\`uuid\` = t.\`user_uuid\`
       JOIN \`developer_oauth_services\` s ON s.\`app_sid\` = t.\`app_sid\`
       JOIN \`developer_apps\` a ON a.\`sid\` = s.\`app_sid\`
      WHERE t.\`token_hash\` = ? AND t.\`kind\` = 'access'
        AND t.\`revoked_at\` IS NULL
        AND (t.\`expires_at\` IS NULL OR t.\`expires_at\` > NOW())
        AND u.\`status\` = 'normal'
        AND s.\`status\` = 'active' AND a.\`status\` = 'active'
      LIMIT 1`,
    [hashToken(token)]
  )
  return rows[0] ?? null
}

export async function revokeOAuthToken(token: string, appSid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `family_id` FROM `oauth_tokens` WHERE `token_hash` = ? AND `app_sid` = ? LIMIT 1',
    [hashToken(token), appSid]
  )
  if (rows[0]?.family_id) await revokeTokenFamily(String(rows[0].family_id))
}

export interface UserOAuthAuthorization {
  appSid: string
  name: string
  iconUrl: string | null
  scopes: string[]
  authorizedAt: string
}

export async function listUserAuthorizations(userUuid: string): Promise<UserOAuthAuthorization[]> {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT t.\`app_sid\`, a.\`name\`, a.\`icon_url\`, MIN(t.\`created_at\`) AS \`authorized_at\`,
            GROUP_CONCAT(DISTINCT t.\`scope\`) AS \`scopes\`
       FROM \`oauth_tokens\` t
       JOIN \`developer_oauth_services\` s ON s.\`app_sid\` = t.\`app_sid\`
       JOIN \`developer_apps\` a ON a.\`sid\` = s.\`app_sid\`
      WHERE t.\`user_uuid\` = ? AND t.\`revoked_at\` IS NULL
        AND (t.\`expires_at\` IS NULL OR t.\`expires_at\` > NOW())
      GROUP BY t.\`app_sid\`, a.\`name\`, a.\`icon_url\`
      ORDER BY \`authorized_at\` DESC`,
    [userUuid]
  )
  return rows.map(row => ({
    appSid: String(row.app_sid),
    name: String(row.name),
    iconUrl: row.icon_url ? String(row.icon_url) : null,
    scopes: [...new Set(String(row.scopes ?? '').split(/[,\s]+/).filter(Boolean))],
    authorizedAt: String(row.authorized_at)
  }))
}

export async function revokeUserAppTokens(userUuid: string, appSid: string) {
  await useDb().execute(
    'UPDATE `oauth_tokens` SET `revoked_at` = NOW() WHERE `user_uuid` = ? AND `app_sid` = ? AND `revoked_at` IS NULL',
    [userUuid, appSid]
  )
}

export async function revokeAppTokens(appSid: string) {
  await useDb().execute(
    'UPDATE `oauth_tokens` SET `revoked_at` = NOW() WHERE `app_sid` = ? AND `revoked_at` IS NULL',
    [appSid]
  )
}

export async function deleteOAuthTokensForApp(appSid: string) {
  await useDb().execute('DELETE FROM `oauth_tokens` WHERE `app_sid` = ?', [appSid])
}

// ---------- Redis 临时会话 ----------

export async function storeOAuthCode(code: string, session: OAuthCodeSession) {
  await useRedis().set(AUTH_KEYS.oauthCode(hashToken(code)), JSON.stringify(session), 'EX', 300)
}

export async function readOAuthCode(code: string): Promise<OAuthCodeSession | null> {
  const raw = await useRedis().get(AUTH_KEYS.oauthCode(hashToken(code)))
  if (!raw) return null
  try {
    return JSON.parse(raw) as OAuthCodeSession
  } catch {
    return null
  }
}

export async function deleteOAuthCode(code: string): Promise<boolean> {
  const deleted = await useRedis().del(AUTH_KEYS.oauthCode(hashToken(code)))
  return deleted === 1
}

export async function storeOAuthConsent(token: string, session: OAuthCodeSession & { state?: string }) {
  await useRedis().set(AUTH_KEYS.oauthConsent(token), JSON.stringify(session), 'EX', 600)
}

export async function consumeOAuthConsent(token: string) {
  const redis = useRedis()
  const key = AUTH_KEYS.oauthConsent(token)
  const raw = await redis.get(key)
  if (!raw) return null
  await redis.del(key)
  try {
    return JSON.parse(raw) as OAuthCodeSession & { state?: string }
  } catch {
    return null
  }
}

export async function storeDeviceSession(deviceCode: string, userCode: string, session: OAuthDeviceSession) {
  const redis = useRedis()
  session.userCode = userCode
  await redis.set(AUTH_KEYS.oauthDevice(deviceCode), JSON.stringify(session), 'EX', 900)
  await redis.set(AUTH_KEYS.oauthDeviceUser(userCode), deviceCode, 'EX', 900)
}

export async function getDeviceSessionByCode(deviceCode: string): Promise<OAuthDeviceSession | null> {
  const raw = await useRedis().get(AUTH_KEYS.oauthDevice(deviceCode))
  if (!raw) return null
  try {
    return JSON.parse(raw) as OAuthDeviceSession
  } catch {
    return null
  }
}

export async function getDeviceSessionByUserCode(userCode: string) {
  const redis = useRedis()
  const deviceCode = await redis.get(AUTH_KEYS.oauthDeviceUser(userCode))
  if (!deviceCode) return null
  const session = await getDeviceSessionByCode(deviceCode)
  return session ? { deviceCode, session } : null
}

export async function updateDeviceSession(deviceCode: string, session: OAuthDeviceSession) {
  await useRedis().set(AUTH_KEYS.oauthDevice(deviceCode), JSON.stringify(session), 'EX', 900)
}

export async function deleteDeviceSession(deviceCode: string) {
  const redis = useRedis()
  const session = await getDeviceSessionByCode(deviceCode)
  await redis.del(AUTH_KEYS.oauthDevice(deviceCode))
  if (session?.userCode) await redis.del(AUTH_KEYS.oauthDeviceUser(session.userCode))
}
