import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2/promise'
import {
  contentSlugAvailable,
  nextContentSlug,
  normalizeContentSlug,
  readGroupFields,
  readSnippetFields,
  replaceContentTags,
  replaceSnippetDependencies,
  VISIBILITIES
} from './contentInput'
import { authenticateApiKey, requireApiKeyPermission, type ApiKeyAuth, type ApiKeyPermission } from './apiKey'
import { useDb } from './db'
import { shortId } from './id'
import { attachTags } from './publicContent'
import { enforceRateLimit } from './rateLimit'

const READ_LIMIT = 120
const WRITE_LIMIT = 30
const RATE_WINDOW = 60
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export interface ApiPagination {
  limit: number
  offset: number
  total: number
  hasMore: boolean
}

export interface ApiLanguage {
  slug: string
  name: string
  logoUrl: string | null
}

export interface ApiTag {
  key: string
  name: string
}

export interface ApiDependency {
  slug: string
  name: string
  kind: string
}

export interface ApiSnippet {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  code: string
  language: ApiLanguage | null
  group: { slug: string, name: string } | null
  tags: ApiTag[]
  dependencies: ApiDependency[]
  forkFromSid: string | null
  favoriteCount: number
  copyCount: number
  forkCount: number
  createdAt: string
  updatedAt: string
}

export interface ApiGroup {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  tags: ApiTag[]
  snippetCount: number
  forkFromSid: string | null
  favoriteCount: number
  forkCount: number
  createdAt: string
  updatedAt: string
}

interface SnippetDetailRow extends RowDataPacket {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  code: string
  fork_from_sid: string | null
  favorite_count: number
  copy_count: number
  fork_count: number
  created_at: string
  updated_at: string
  language_sid: string
  language_slug: string
  language_name: string
  language_logo: string | null
  group_slug: string | null
  group_name: string | null
}

export async function requireApiV1(
  event: H3Event,
  permission: ApiKeyPermission
): Promise<ApiKeyAuth> {
  const auth = await authenticateApiKey(event)
  requireApiKeyPermission(auth, permission)
  const write = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(getMethod(event))
  await enforceRateLimit(event, {
    bucket: write ? 'api-v1:write' : 'api-v1:read',
    identity: `key:${auth.keySid}`,
    limit: write ? WRITE_LIMIT : READ_LIMIT,
    window: RATE_WINDOW,
    failOpen: false,
    message: write
      ? 'API write rate limit exceeded (30 requests per minute)'
      : 'API read rate limit exceeded (120 requests per minute)'
  })
  return auth
}

export function readPagination(event: H3Event): { limit: number, offset: number } {
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const offset = Math.max(Number(query.offset) || 0, 0)
  return { limit, offset }
}

export function readVisibilityFilter(value: unknown): string | null {
  const visibility = String(value ?? '').trim()
  if (!visibility) return null
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'visibility must be public, unlisted or private',
      data: { field: 'visibility' }
    })
  }
  return visibility
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, char => `\\${char}`)
}

async function attachDependencies<T extends { sid: string }>(items: T[]) {
  if (!items.length) return items.map(item => ({ ...item, dependencies: [] as ApiDependency[] }))
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT sd.\`snippet_sid\`, d.\`slug\`, d.\`name\`, d.\`kind\`
       FROM \`snippet_dependencies\` sd
       JOIN \`dependencies\` d ON d.\`sid\` = sd.\`dependency_sid\`
      WHERE sd.\`snippet_sid\` IN (${items.map(() => '?').join(', ')})
      ORDER BY d.\`kind\` ASC, d.\`name\` ASC`,
    items.map(item => item.sid)
  )
  const bySid = new Map<string, ApiDependency[]>()
  for (const row of rows) {
    const list = bySid.get(row.snippet_sid as string) ?? []
    list.push({ slug: row.slug as string, name: row.name as string, kind: row.kind as string })
    bySid.set(row.snippet_sid as string, list)
  }
  return items.map(item => ({ ...item, dependencies: bySid.get(item.sid) ?? [] }))
}

async function decorateSnippets<T extends { sid: string }>(items: T[]) {
  return await attachDependencies(await attachTags(items))
}

export async function listApiSnippets(
  auth: ApiKeyAuth,
  options: { limit: number, offset: number, q?: unknown, visibility?: unknown }
) {
  const { limit, offset } = options
  const visibility = readVisibilityFilter(options.visibility)
  const q = String(options.q ?? '').trim().slice(0, 200)
  const params: (string | number)[] = [auth.user.uuid]
  const conditions = [
    'c.`owner_uuid` = ?',
    "c.`kind` = 'snippet'",
    'c.`deleted_at` IS NULL'
  ]
  if (visibility) {
    conditions.push('c.`visibility` = ?')
    params.push(visibility)
  }
  if (q) {
    conditions.push('(c.`name` LIKE ? ESCAPE \'\\\\\' OR c.`intro` LIKE ? ESCAPE \'\\\\\')')
    const pattern = `%${escapeLike(q)}%`
    params.push(pattern, pattern)
  }
  const where = conditions.join(' AND ')
  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`contents\` c WHERE ${where}`,
    params
  )
  const total = Number(countRow?.total ?? 0)
  const [rows] = await useDb().query<SnippetDetailRow[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`code\`,
            c.\`fork_from_sid\`, c.\`favorite_count\`, c.\`copy_count\`, c.\`fork_count\`,
            c.\`created_at\`, c.\`updated_at\`, c.\`language_sid\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`,
            g.\`slug\` AS \`group_slug\`, g.\`name\` AS \`group_name\`
       FROM \`contents\` c
       JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
       LEFT JOIN \`contents\` g ON g.\`sid\` = c.\`group_sid\` AND g.\`deleted_at\` IS NULL
      WHERE ${where}
      ORDER BY c.\`updated_at\` DESC, c.\`sid\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  const decorated = await decorateSnippets(rows.map(rowToSnippet))
  return {
    snippets: decorated,
    pagination: { limit, offset, total, hasMore: offset + rows.length < total } satisfies ApiPagination
  }
}

function rowToSnippet(row: SnippetDetailRow): ApiSnippet {
  return {
    sid: row.sid,
    slug: row.slug,
    name: row.name,
    intro: row.intro,
    visibility: row.visibility,
    code: row.code,
    language: {
      slug: row.language_slug,
      name: row.language_name,
      logoUrl: row.language_logo
    },
    group: row.group_slug ? { slug: row.group_slug, name: row.group_name ?? '' } : null,
    tags: [],
    dependencies: [],
    forkFromSid: row.fork_from_sid,
    favoriteCount: Number(row.favorite_count ?? 0),
    copyCount: Number(row.copy_count ?? 0),
    forkCount: Number(row.fork_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function fetchOwnSnippet(ownerUuid: string, slug: string): Promise<ApiSnippet | null> {
  const [rows] = await useDb().query<SnippetDetailRow[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`code\`,
            c.\`fork_from_sid\`, c.\`favorite_count\`, c.\`copy_count\`, c.\`fork_count\`,
            c.\`created_at\`, c.\`updated_at\`, c.\`language_sid\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`,
            g.\`slug\` AS \`group_slug\`, g.\`name\` AS \`group_name\`
       FROM \`contents\` c
       JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
       LEFT JOIN \`contents\` g ON g.\`sid\` = c.\`group_sid\` AND g.\`deleted_at\` IS NULL
      WHERE c.\`owner_uuid\` = ? AND c.\`slug\` = ? AND c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL
      LIMIT 1`,
    [ownerUuid, slug]
  )
  if (!rows[0]) return null
  return (await decorateSnippets([rowToSnippet(rows[0])]))[0]!
}

export async function getApiSnippet(auth: ApiKeyAuth, slug: string) {
  const snippet = await fetchOwnSnippet(auth.user.uuid, slug)
  if (!snippet) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  return snippet
}

export async function createApiSnippet(auth: ApiKeyAuth, body: Record<string, unknown>) {
  const fields = await readSnippetFields(body, auth.user)
  const requestedSlug = normalizeContentSlug(body.slug)
  let slug: string
  let deduplicated = false
  if (requestedSlug) {
    if (!(await contentSlugAvailable(auth.user.uuid, requestedSlug))) {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
    }
    slug = requestedSlug
  } else {
    const generated = await nextContentSlug(auth.user.uuid, fields.name)
    slug = generated.slug
    deduplicated = generated.adjusted
  }

  const sid = shortId()
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      `INSERT INTO \`contents\`
         (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`, \`group_sid\`, \`language_sid\`, \`code\`)
       VALUES (?, ?, 'snippet', ?, ?, ?, ?, ?, ?, ?)`,
      [sid, auth.user.uuid, slug, fields.name, fields.intro, fields.visibility,
        fields.groupSid, fields.languageSid, fields.code]
    )
    await replaceContentTags(conn, sid, fields.tags)
    await replaceSnippetDependencies(conn, sid, fields.dependencySids)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken, please try again' })
    }
    throw err
  } finally {
    conn.release()
  }
  return { snippet: (await fetchOwnSnippet(auth.user.uuid, slug))!, deduplicated }
}

export async function updateApiSnippet(
  auth: ApiKeyAuth,
  slug: string,
  body: Record<string, unknown>
) {
  const current = await fetchOwnSnippet(auth.user.uuid, slug)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)
  const merged = {
    name: has('name') ? body.name : current.name,
    intro: has('intro') ? body.intro : current.intro,
    visibility: has('visibility') ? body.visibility : current.visibility,
    code: has('code') ? body.code : current.code,
    language: has('language') ? body.language : current.language?.slug,
    group: has('group') ? body.group : current.group?.slug ?? '',
    tags: has('tags') ? body.tags : current.tags.map(tag => tag.name),
    dependencies: has('dependencies') ? body.dependencies : current.dependencies.map(item => item.slug)
  }
  const fields = await readSnippetFields(merged, auth.user)
  const requestedSlug = normalizeContentSlug(body.slug)
  const nextSlug = requestedSlug ?? current.slug
  const slugChanged = nextSlug !== current.slug
  if (slugChanged && !(await contentSlugAvailable(auth.user.uuid, nextSlug, current.sid))) {
    throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
  }

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    if (slugChanged) {
      await conn.execute(
        'DELETE FROM `content_aliases` WHERE `owner_uuid` = ? AND `slug` = ? AND `content_sid` = ?',
        [auth.user.uuid, nextSlug, current.sid]
      )
      await conn.execute(
        `INSERT IGNORE INTO \`content_aliases\` (\`sid\`, \`owner_uuid\`, \`slug\`, \`content_sid\`)
         VALUES (?, ?, ?, ?)`,
        [shortId(), auth.user.uuid, current.slug, current.sid]
      )
    }
    await conn.execute(
      `UPDATE \`contents\`
          SET \`slug\` = ?, \`name\` = ?, \`intro\` = ?, \`visibility\` = ?, \`group_sid\` = ?,
              \`language_sid\` = ?, \`code\` = ?
        WHERE \`sid\` = ? AND \`owner_uuid\` = ?`,
      [nextSlug, fields.name, fields.intro, fields.visibility, fields.groupSid,
        fields.languageSid, fields.code, current.sid, auth.user.uuid]
    )
    await replaceContentTags(conn, current.sid, fields.tags)
    await replaceSnippetDependencies(conn, current.sid, fields.dependencySids)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
    }
    throw err
  } finally {
    conn.release()
  }
  return {
    snippet: (await fetchOwnSnippet(auth.user.uuid, nextSlug))!,
    previousSlug: slug,
    slugChanged
  }
}

export async function deleteApiSnippet(auth: ApiKeyAuth, slug: string) {
  const [result] = await useDb().execute<{ affectedRows: number }>(
    `UPDATE \`contents\` SET \`deleted_at\` = NOW()
      WHERE \`owner_uuid\` = ? AND \`slug\` = ? AND \`kind\` = 'snippet' AND \`deleted_at\` IS NULL`,
    [auth.user.uuid, slug]
  )
  if (!Number(result.affectedRows ?? 0)) {
    throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  }
}

interface GroupDetailRow extends RowDataPacket {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  fork_from_sid: string | null
  favorite_count: number
  fork_count: number
  created_at: string
  updated_at: string
  snippet_count: number
}

function rowToGroup(row: GroupDetailRow): ApiGroup {
  return {
    sid: row.sid,
    slug: row.slug,
    name: row.name,
    intro: row.intro,
    visibility: row.visibility,
    tags: [],
    snippetCount: Number(row.snippet_count ?? 0),
    forkFromSid: row.fork_from_sid,
    favoriteCount: Number(row.favorite_count ?? 0),
    forkCount: Number(row.fork_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const GROUP_SELECT = `g.\`sid\`, g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`visibility\`,
  g.\`fork_from_sid\`, g.\`favorite_count\`, g.\`fork_count\`, g.\`created_at\`, g.\`updated_at\`,
  (SELECT COUNT(*) FROM \`contents\` s
    WHERE s.\`group_sid\` = g.\`sid\` AND s.\`kind\` = 'snippet' AND s.\`deleted_at\` IS NULL) AS \`snippet_count\``

async function fetchOwnGroup(ownerUuid: string, slug: string): Promise<ApiGroup | null> {
  const [rows] = await useDb().query<GroupDetailRow[]>(
    `SELECT ${GROUP_SELECT} FROM \`contents\` g
      WHERE g.\`owner_uuid\` = ? AND g.\`slug\` = ? AND g.\`kind\` = 'group' AND g.\`deleted_at\` IS NULL
      LIMIT 1`,
    [ownerUuid, slug]
  )
  if (!rows[0]) return null
  return (await attachTags([rowToGroup(rows[0])]))[0]!
}

export async function listApiGroups(
  auth: ApiKeyAuth,
  options: { limit: number, offset: number, q?: unknown, visibility?: unknown }
) {
  const { limit, offset } = options
  const visibility = readVisibilityFilter(options.visibility)
  const q = String(options.q ?? '').trim().slice(0, 200)
  const params: (string | number)[] = [auth.user.uuid]
  const conditions = [
    'g.`owner_uuid` = ?',
    "g.`kind` = 'group'",
    'g.`deleted_at` IS NULL'
  ]
  if (visibility) {
    conditions.push('g.`visibility` = ?')
    params.push(visibility)
  }
  if (q) {
    conditions.push('(g.`name` LIKE ? ESCAPE \'\\\\\' OR g.`intro` LIKE ? ESCAPE \'\\\\\')')
    const pattern = `%${escapeLike(q)}%`
    params.push(pattern, pattern)
  }
  const where = conditions.join(' AND ')
  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`contents\` g WHERE ${where}`,
    params
  )
  const total = Number(countRow?.total ?? 0)
  const [rows] = await useDb().query<GroupDetailRow[]>(
    `SELECT ${GROUP_SELECT} FROM \`contents\` g
      WHERE ${where}
      ORDER BY g.\`updated_at\` DESC, g.\`sid\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  const groups = await attachTags(rows.map(rowToGroup))
  return {
    groups,
    pagination: { limit, offset, total, hasMore: offset + rows.length < total } satisfies ApiPagination
  }
}

export async function getApiGroup(auth: ApiKeyAuth, slug: string) {
  const group = await fetchOwnGroup(auth.user.uuid, slug)
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  return group
}

export async function createApiGroup(auth: ApiKeyAuth, body: Record<string, unknown>) {
  const fields = readGroupFields(body, auth.user)
  const requestedSlug = normalizeContentSlug(body.slug)
  let slug: string
  let deduplicated = false
  if (requestedSlug) {
    if (!(await contentSlugAvailable(auth.user.uuid, requestedSlug))) {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
    }
    slug = requestedSlug
  } else {
    const generated = await nextContentSlug(auth.user.uuid, fields.name)
    slug = generated.slug
    deduplicated = generated.adjusted
  }

  const sid = shortId()
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      `INSERT INTO \`contents\` (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`)
       VALUES (?, ?, 'group', ?, ?, ?, ?)`,
      [sid, auth.user.uuid, slug, fields.name, fields.intro, fields.visibility]
    )
    await replaceContentTags(conn, sid, fields.tags)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken, please try again' })
    }
    throw err
  } finally {
    conn.release()
  }
  return { group: (await fetchOwnGroup(auth.user.uuid, slug))!, deduplicated }
}

export async function updateApiGroup(
  auth: ApiKeyAuth,
  slug: string,
  body: Record<string, unknown>
) {
  const current = await fetchOwnGroup(auth.user.uuid, slug)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)
  const fields = readGroupFields({
    name: has('name') ? body.name : current.name,
    intro: has('intro') ? body.intro : current.intro,
    visibility: has('visibility') ? body.visibility : current.visibility,
    tags: has('tags') ? body.tags : current.tags.map(tag => tag.name)
  }, auth.user)

  const requestedSlug = normalizeContentSlug(body.slug)
  const nextSlug = requestedSlug ?? current.slug
  const slugChanged = nextSlug !== current.slug
  if (slugChanged && !(await contentSlugAvailable(auth.user.uuid, nextSlug, current.sid))) {
    throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
  }

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    if (slugChanged) {
      await conn.execute(
        'DELETE FROM `content_aliases` WHERE `owner_uuid` = ? AND `slug` = ? AND `content_sid` = ?',
        [auth.user.uuid, nextSlug, current.sid]
      )
      await conn.execute(
        `INSERT IGNORE INTO \`content_aliases\` (\`sid\`, \`owner_uuid\`, \`slug\`, \`content_sid\`)
         VALUES (?, ?, ?, ?)`,
        [shortId(), auth.user.uuid, current.slug, current.sid]
      )
    }
    await conn.execute(
      'UPDATE `contents` SET `slug` = ?, `name` = ?, `intro` = ?, `visibility` = ? WHERE `sid` = ? AND `owner_uuid` = ?',
      [nextSlug, fields.name, fields.intro, fields.visibility, current.sid, auth.user.uuid]
    )
    await replaceContentTags(conn, current.sid, fields.tags)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
    }
    throw err
  } finally {
    conn.release()
  }
  return {
    group: (await fetchOwnGroup(auth.user.uuid, nextSlug))!,
    previousSlug: slug,
    slugChanged
  }
}

export async function deleteApiGroup(auth: ApiKeyAuth, slug: string) {
  const current = await fetchOwnGroup(auth.user.uuid, slug)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      "UPDATE `contents` SET `group_sid` = NULL WHERE `group_sid` = ? AND `owner_uuid` = ? AND `kind` = 'snippet'",
      [current.sid, auth.user.uuid]
    )
    await conn.execute(
      "UPDATE `contents` SET `deleted_at` = NOW() WHERE `sid` = ? AND `owner_uuid` = ?",
      [current.sid, auth.user.uuid]
    )
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export function apiKeySummary(auth: ApiKeyAuth) {
  return {
    sid: auth.keySid,
    name: auth.keyName,
    permissions: auth.permissions,
    expiresAt: auth.expiresAt,
    lastUsedAt: auth.lastUsedAt
  }
}
