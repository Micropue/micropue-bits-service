import type { RowDataPacket } from 'mysql2/promise'
import { normalizeRedirectUris } from './oauth'
import { useDb } from './db'

// 控制台 · Developer 管理：App 与 OAuth 服务
export interface AdminDeveloperApp {
  sid: string
  name: string
  homepageUrl: string
  iconUrl: string | null
  description: string
  status: string
  createdAt: string
  owner: { uuid: string, email: string, username: string }
  service: { appSid: string, status: string } | null
}

export interface AdminOAuthService {
  appSid: string
  name: string
  iconUrl: string | null
  status: string
  appStatus: string
  redirectUris: string[]
  allowWildcard: boolean
  deviceFlow: boolean
  expireUserTokens: boolean
  createdAt: string
  owner: { uuid: string, email: string, username: string }
}

export async function listAdminDeveloperApps(): Promise<AdminDeveloperApp[]> {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT a.\`sid\`, a.\`name\`, a.\`homepage_url\`, a.\`icon_url\`, a.\`description\`, a.\`status\`,
            a.\`created_at\`, a.\`user_uuid\`, u.\`email\`, u.\`username\`,
            s.\`app_sid\` AS \`service_app_sid\`, s.\`status\` AS \`service_status\`
       FROM \`developer_apps\` a
       JOIN \`users\` u ON u.\`uuid\` = a.\`user_uuid\`
       LEFT JOIN \`developer_oauth_services\` s ON s.\`app_sid\` = a.\`sid\`
      ORDER BY a.\`created_at\` DESC
      LIMIT 500`
  )
  return rows.map(row => ({
    sid: String(row.sid),
    name: String(row.name),
    homepageUrl: String(row.homepage_url),
    iconUrl: row.icon_url ? String(row.icon_url) : null,
    description: String(row.description),
    status: String(row.status),
    createdAt: String(row.created_at),
    owner: { uuid: String(row.user_uuid), email: String(row.email), username: String(row.username) },
    service: row.service_app_sid
      ? { appSid: String(row.service_app_sid), status: String(row.service_status) }
      : null
  }))
}

export async function listAdminOAuthServices(): Promise<AdminOAuthService[]> {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT s.\`app_sid\`, s.\`status\`, s.\`redirect_uris\`, s.\`allow_wildcard\`, s.\`device_flow\`,
            s.\`expire_user_tokens\`, s.\`created_at\`, s.\`user_uuid\`,
            a.\`name\`, a.\`icon_url\`, a.\`status\` AS \`app_status\`,
            u.\`email\`, u.\`username\`
       FROM \`developer_oauth_services\` s
       JOIN \`developer_apps\` a ON a.\`sid\` = s.\`app_sid\`
       JOIN \`users\` u ON u.\`uuid\` = s.\`user_uuid\`
      ORDER BY s.\`created_at\` DESC
      LIMIT 500`
  )
  return rows.map(row => ({
    appSid: String(row.app_sid),
    name: String(row.name),
    iconUrl: row.icon_url ? String(row.icon_url) : null,
    status: String(row.status),
    appStatus: String(row.app_status),
    redirectUris: normalizeRedirectUris(row.redirect_uris),
    allowWildcard: !!row.allow_wildcard,
    deviceFlow: !!row.device_flow,
    expireUserTokens: !!row.expire_user_tokens,
    createdAt: String(row.created_at),
    owner: { uuid: String(row.user_uuid), email: String(row.email), username: String(row.username) }
  }))
}

export async function updateDeveloperAppStatus(sid: string, status: string): Promise<boolean> {
  const [result] = await useDb().execute('UPDATE `developer_apps` SET `status` = ? WHERE `sid` = ?', [status, sid])
  return result.affectedRows > 0
}

export async function updateOAuthServiceStatus(appSid: string, status: string): Promise<boolean> {
  const [result] = await useDb().execute(
    'UPDATE `developer_oauth_services` SET `status` = ? WHERE `app_sid` = ?',
    [status, appSid]
  )
  return result.affectedRows > 0
}

export async function deleteDeveloperApp(sid: string, ownerUuid?: string): Promise<boolean> {
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    const [app] = await conn.query<RowDataPacket[]>(
      `SELECT \`sid\` FROM \`developer_apps\` WHERE \`sid\` = ?${ownerUuid ? ' AND `user_uuid` = ?' : ''} LIMIT 1`,
      ownerUuid ? [sid, ownerUuid] : [sid]
    )
    if (!app[0]) {
      await conn.rollback()
      return false
    }
    await conn.execute('DELETE FROM `oauth_tokens` WHERE `app_sid` = ?', [sid])
    await conn.execute('DELETE FROM `developer_oauth_services` WHERE `app_sid` = ?', [sid])
    await conn.execute('DELETE FROM `developer_apps` WHERE `sid` = ?', [sid])
    await conn.commit()
    return true
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function deleteOAuthService(appSid: string, ownerUuid?: string): Promise<boolean> {
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    const [service] = await conn.query<RowDataPacket[]>(
      `SELECT \`app_sid\` FROM \`developer_oauth_services\` WHERE \`app_sid\` = ?${ownerUuid ? ' AND `user_uuid` = ?' : ''} LIMIT 1`,
      ownerUuid ? [appSid, ownerUuid] : [appSid]
    )
    if (!service[0]) {
      await conn.rollback()
      return false
    }
    await conn.execute('DELETE FROM `oauth_tokens` WHERE `app_sid` = ?', [appSid])
    await conn.execute('DELETE FROM `developer_oauth_services` WHERE `app_sid` = ?', [appSid])
    await conn.commit()
    return true
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
