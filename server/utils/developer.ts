import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2/promise'
import { getAuthUser, type AuthUser } from './auth'
import { useDb } from './db'
import { shortId } from './id'

// 开发者中心：账号必须已设置用户名、密码并开启 2FA
export async function requireDeveloperUser(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })

  const missing: string[] = []
  if (user.username === user.email) missing.push('username')
  if (!user.password_hash) missing.push('password')
  if (!user.two_factor_enabled) missing.push('2fa')
  if (missing.length) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Complete your account setup before using the developer portal',
      data: { code: 'DEVELOPER_SETUP_REQUIRED', missing }
    })
  }
  return user
}

const URL_RE = /^https?:\/\/[^\s]+$/i

export interface DeveloperAppInput {
  name: string
  homepageUrl: string
  iconUrl: string | null
  description: string
}

export interface DeveloperApp {
  sid: string
  name: string
  homepageUrl: string
  iconUrl: string | null
  description: string
  status: string
  createdAt: string
}

interface DeveloperAppRow extends RowDataPacket {
  sid: string
  user_uuid: string
  name: string
  homepage_url: string
  icon_url: string | null
  description: string
  status: string
  created_at: string
}

export function readDeveloperAppInput(body: Record<string, unknown>): DeveloperAppInput {
  const name = String(body.name ?? '').trim()
  const homepageUrl = String(body.homepageUrl ?? '').trim()
  const iconUrl = String(body.iconUrl ?? '').trim()
  const description = String(body.description ?? '').trim()

  if (!name || name.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Application name is required (80 characters or less)',
      data: { field: 'name' }
    })
  }
  if (!homepageUrl || homepageUrl.length > 512 || !URL_RE.test(homepageUrl)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Homepage URL must be a valid http(s) URL',
      data: { field: 'homepageUrl' }
    })
  }
  if (iconUrl && (iconUrl.length > 512 || !URL_RE.test(iconUrl))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Icon URL must be a valid http(s) URL',
      data: { field: 'iconUrl' }
    })
  }
  if (!description || description.length > 500) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Application description is required (500 characters or less)',
      data: { field: 'description' }
    })
  }

  return { name, homepageUrl, iconUrl: iconUrl || null, description }
}

const APP_COLUMNS = '`sid`, `user_uuid`, `name`, `homepage_url`, `icon_url`, `description`, `status`, `created_at`'

function publicDeveloperApp(row: DeveloperAppRow): DeveloperApp {
  return {
    sid: row.sid,
    name: row.name,
    homepageUrl: row.homepage_url,
    iconUrl: row.icon_url,
    description: row.description,
    status: row.status,
    createdAt: row.created_at
  }
}

export async function listDeveloperApps(
  userUuid: string,
  options: { limit?: number, offset?: number } = {}
): Promise<{ apps: DeveloperApp[], total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    'SELECT COUNT(*) AS `total` FROM `developer_apps` WHERE `user_uuid` = ?',
    [userUuid]
  )
  const [rows] = await useDb().query<DeveloperAppRow[]>(
    `SELECT ${APP_COLUMNS}
       FROM \`developer_apps\`
      WHERE \`user_uuid\` = ?
      ORDER BY \`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [userUuid, limit, offset]
  )
  return { apps: rows.map(publicDeveloperApp), total: Number(countRow?.total ?? 0) }
}

export async function getDeveloperAppDetail(userUuid: string, sid: string): Promise<DeveloperApp | null> {
  const [rows] = await useDb().query<DeveloperAppRow[]>(
    `SELECT ${APP_COLUMNS} FROM \`developer_apps\` WHERE \`sid\` = ? AND \`user_uuid\` = ? LIMIT 1`,
    [sid, userUuid]
  )
  return rows[0] ? publicDeveloperApp(rows[0]) : null
}

export async function createDeveloperApp(userUuid: string, input: DeveloperAppInput): Promise<DeveloperApp> {
  const sid = shortId()
  await useDb().execute(
    `INSERT INTO \`developer_apps\` (\`sid\`, \`user_uuid\`, \`name\`, \`homepage_url\`, \`icon_url\`, \`description\`)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sid, userUuid, input.name, input.homepageUrl, input.iconUrl, input.description]
  )
  return (await getDeveloperAppDetail(userUuid, sid))!
}

export async function updateDeveloperApp(
  userUuid: string,
  sid: string,
  input: DeveloperAppInput
): Promise<DeveloperApp | null> {
  const [existing] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid` FROM `developer_apps` WHERE `sid` = ? AND `user_uuid` = ? LIMIT 1',
    [sid, userUuid]
  )
  if (!existing[0]) return null

  await useDb().execute(
    `UPDATE \`developer_apps\`
        SET \`name\` = ?, \`homepage_url\` = ?, \`icon_url\` = ?, \`description\` = ?
      WHERE \`sid\` = ? AND \`user_uuid\` = ?`,
    [input.name, input.homepageUrl, input.iconUrl, input.description, sid, userUuid]
  )
  return await getDeveloperAppDetail(userUuid, sid)
}
