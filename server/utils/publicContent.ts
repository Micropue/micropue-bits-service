import type { RowDataPacket } from 'mysql2/promise'

// 公开内容 / 用户主页读取
// 用户名必须由用户主动设置（username <> email）：未设置用户名的账户不能被主页/内容 URL 暴露

export function githubAvatar(githubId: unknown): string | null {
  return githubId ? `https://avatars.githubusercontent.com/u/${githubId}?v=4` : null
}

export interface PublicUserRow extends RowDataPacket {
  uuid: string
  username: string
  nickname: string
  bio: string
  github_id: string | number | null
  created_at: string
}

export async function findPublicUser(username: string): Promise<PublicUserRow | null> {
  if (!username || username.length > 40) return null
  const [rows] = await useDb().query<PublicUserRow[]>(
    `SELECT \`uuid\`, \`username\`, \`nickname\`, \`bio\`, \`github_id\`, \`created_at\`
       FROM \`users\`
      WHERE \`username\` = ? AND \`status\` = 'normal' AND \`username\` <> \`email\`
      LIMIT 1`,
    [username]
  )
  return rows[0] ?? null
}

export interface ContentPageOptions {
  q?: string
  limit?: number
  offset?: number
}

// 代码段列表：作者本人可取全部（含 private / unlisted），访客只看 public
// 支持关键词搜索与分页，返回当前页 + 总数
export async function fetchUserSnippets(ownerUuid: string, includeAll = false, options: ContentPageOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50)
  const offset = Math.max(options.offset ?? 0, 0)
  const terms = keywordTerms(options.q, 5)
  const params: (string | number)[] = [ownerUuid]
  const filters = terms.map(term => snippetKeywordCondition(term, params))
  const where = [
    'c.`owner_uuid` = ?',
    "c.`kind` = 'snippet'",
    'c.`deleted_at` IS NULL',
    ...(includeAll ? [] : ["c.`visibility` = 'public'"]),
    ...filters
  ].join(' AND ')

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\`
       FROM \`contents\` c
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE ${where}`,
    params
  )

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`updated_at\`, c.\`group_sid\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`
       FROM \`contents\` c
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE ${where}
      ORDER BY c.\`updated_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const items = await attachTags(rows.map(row => ({
    sid: row.sid as string,
    slug: row.slug as string,
    name: row.name as string,
    intro: row.intro as string,
    visibility: row.visibility as string,
    updated_at: row.updated_at as string,
    group_sid: row.group_sid as string | null,
    language: row.language_slug
      ? { slug: row.language_slug as string, name: row.language_name as string, logo_url: row.language_logo as string | null }
      : null
  })))
  return { items, total: Number(countRow?.total ?? 0) }
}

// 分组列表：同上；snippetCount 按访客/作者口径统计；支持关键词与分页
export async function fetchUserGroups(ownerUuid: string, includeAll = false, options: ContentPageOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50)
  const offset = Math.max(options.offset ?? 0, 0)
  const terms = keywordTerms(options.q, 5)
  const params: (string | number)[] = [ownerUuid]
  const filters = terms.map(term => groupKeywordCondition(term, params))
  const where = [
    'g.`owner_uuid` = ?',
    "g.`kind` = 'group'",
    'g.`deleted_at` IS NULL',
    ...(includeAll ? [] : ["g.`visibility` = 'public'"]),
    ...filters
  ].join(' AND ')

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`contents\` g WHERE ${where}`,
    params
  )

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT g.\`sid\`, g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`visibility\`, g.\`updated_at\`,
            (SELECT COUNT(*) FROM \`contents\` s
              WHERE s.\`group_sid\` = g.\`sid\` AND s.\`kind\` = 'snippet' AND s.\`deleted_at\` IS NULL
                ${includeAll ? '' : "AND s.`visibility` = 'public'"}) AS \`snippet_count\`
       FROM \`contents\` g
      WHERE ${where}
      ORDER BY g.\`updated_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const items = await attachTags(rows.map(row => ({
    sid: row.sid as string,
    slug: row.slug as string,
    name: row.name as string,
    intro: row.intro as string,
    visibility: row.visibility as string,
    updated_at: row.updated_at as string,
    snippetCount: Number(row.snippet_count ?? 0)
  })))
  return { items, total: Number(countRow?.total ?? 0) }
}

export async function attachTags<T extends { sid: string }>(items: T[]) {
  if (!items.length) return items.map(item => ({ ...item, tags: [] as { key: string, name: string }[] }))
  const sids = items.map(item => item.sid)
  const [tagRows] = await useDb().query<RowDataPacket[]>(
    `SELECT ct.\`content_sid\`, t.\`tag_key\`, t.\`name\`
       FROM \`content_tags\` ct
       JOIN \`tags\` t ON t.\`sid\` = ct.\`tag_sid\`
      WHERE ct.\`content_sid\` IN (${sids.map(() => '?').join(', ')})`,
    sids
  )
  const bySid = new Map<string, { key: string, name: string }[]>()
  for (const tag of tagRows) {
    const list = bySid.get(tag.content_sid as string) ?? []
    list.push({ key: tag.tag_key as string, name: tag.name as string })
    bySid.set(tag.content_sid as string, list)
  }
  return items.map(item => ({ ...item, tags: bySid.get(item.sid) ?? [] }))
}

export interface PublicSnippetRow extends RowDataPacket {
  sid: string
  slug: string
  name: string
  intro: string
  code: string
  visibility: string
  copy_count: number
  fork_count: number
  fork_from_sid: string | null
  created_at: string
  updated_at: string
  language_slug: string | null
  language_name: string | null
  language_logo: string | null
}

export async function fetchSnippetBySlug(ownerUuid: string, slug: string): Promise<PublicSnippetRow | null> {
  if (!slug || slug.length > 40) return null
  const [rows] = await useDb().query<PublicSnippetRow[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`code\`, c.\`visibility\`, c.\`copy_count\`,
            c.\`fork_count\`, c.\`fork_from_sid\`, c.\`created_at\`, c.\`updated_at\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`
       FROM \`contents\` c
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE c.\`owner_uuid\` = ? AND c.\`slug\` = ? AND c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL
      LIMIT 1`,
    [ownerUuid, slug]
  )
  return rows[0] ?? null
}

export interface ContentKindRow extends RowDataPacket {
  sid: string
  kind: string
  slug: string
}

export async function fetchContentKind(ownerUuid: string, slug: string): Promise<ContentKindRow | null> {
  if (!slug || slug.length > 40) return null
  const [rows] = await useDb().query<ContentKindRow[]>(
    'SELECT `sid`, `kind`, `slug` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `deleted_at` IS NULL LIMIT 1',
    [ownerUuid, slug]
  )
  return rows[0] ?? null
}

export interface GroupRow extends RowDataPacket {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  fork_count: number
  fork_from_sid: string | null
  created_at: string
  updated_at: string
}

export async function fetchGroupBySlug(ownerUuid: string, slug: string): Promise<GroupRow | null> {
  if (!slug || slug.length > 40) return null
  const [rows] = await useDb().query<GroupRow[]>(
    `SELECT \`sid\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`, \`fork_count\`, \`fork_from_sid\`, \`created_at\`, \`updated_at\`
       FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`slug\` = ? AND \`kind\` = 'group' AND \`deleted_at\` IS NULL
      LIMIT 1`,
    [ownerUuid, slug]
  )
  return rows[0] ?? null
}

export async function fetchGroupSnippets(groupSid: string, includeAll = false) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`updated_at\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`
       FROM \`contents\` c
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE c.\`group_sid\` = ? AND c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL
        ${includeAll ? '' : "AND c.`visibility` = 'public'"}
      ORDER BY c.\`updated_at\` DESC`,
    [groupSid]
  )
  return attachTags(rows.map(row => ({
    sid: row.sid as string,
    slug: row.slug as string,
    name: row.name as string,
    intro: row.intro as string,
    visibility: row.visibility as string,
    updated_at: row.updated_at as string,
    language: row.language_slug
      ? { slug: row.language_slug as string, name: row.language_name as string, logo_url: row.language_logo as string | null }
      : null
  })))
}

// 流量统计：公开口径只统计 public；作者本人统计全部并附可见性拆分
export async function fetchUserStats(ownerUuid: string, isOwner: boolean) {
  const [[counts]] = await useDb().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM \`contents\` WHERE \`owner_uuid\` = ? AND \`kind\` = 'snippet' AND \`deleted_at\` IS NULL AND (? OR \`visibility\` = 'public')) AS \`snippets\`,
       (SELECT COUNT(*) FROM \`contents\` WHERE \`owner_uuid\` = ? AND \`kind\` = 'group' AND \`deleted_at\` IS NULL AND (? OR \`visibility\` = 'public')) AS \`groups\`,
       (SELECT COALESCE(SUM(\`copy_count\`), 0) FROM \`contents\` WHERE \`owner_uuid\` = ? AND \`kind\` = 'snippet' AND \`deleted_at\` IS NULL AND (? OR \`visibility\` = 'public')) AS \`copies\`,
       (SELECT COALESCE(SUM(\`favorite_count\`), 0) FROM \`contents\` WHERE \`owner_uuid\` = ? AND \`deleted_at\` IS NULL AND (? OR \`visibility\` = 'public')) AS \`favorites\`,
       (SELECT COUNT(*) FROM \`follows\` WHERE \`followee_uuid\` = ?) AS \`followers\`,
       (SELECT COUNT(*) FROM \`follows\` WHERE \`follower_uuid\` = ?) AS \`following\``,
    [ownerUuid, isOwner ? 1 : 0, ownerUuid, isOwner ? 1 : 0, ownerUuid, isOwner ? 1 : 0,
      ownerUuid, isOwner ? 1 : 0, ownerUuid, ownerUuid]
  )

  const stats: Record<string, number | Record<string, number>> = {
    snippets: Number(counts?.snippets ?? 0),
    groups: Number(counts?.groups ?? 0),
    copies: Number(counts?.copies ?? 0),
    favorites: Number(counts?.favorites ?? 0),
    followers: Number(counts?.followers ?? 0),
    following: Number(counts?.following ?? 0)
  }

  if (isOwner) {
    const [rows] = await useDb().query<RowDataPacket[]>(
      "SELECT `visibility`, COUNT(*) AS `count` FROM `contents` WHERE `owner_uuid` = ? AND `kind` = 'snippet' AND `deleted_at` IS NULL GROUP BY `visibility`",
      [ownerUuid]
    )
    const breakdown = { public: 0, unlisted: 0, private: 0 }
    for (const row of rows) {
      const key = row.visibility as keyof typeof breakdown
      if (key in breakdown) breakdown[key] = Number(row.count)
    }
    stats.breakdown = breakdown
  }

  return stats
}

export async function fetchUserLinks(ownerUuid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `platform`, `label`, `url` FROM `user_links` WHERE `user_uuid` = ? ORDER BY `sort_order`, `created_at`',
    [ownerUuid]
  )
  return rows.map(row => ({ platform: row.platform as string, label: row.label as string, url: row.url as string }))
}

export async function isFollowing(viewerUuid: string | null, targetUuid: string): Promise<boolean> {
  if (!viewerUuid || viewerUuid === targetUuid) return false
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT 1 FROM `follows` WHERE `follower_uuid` = ? AND `followee_uuid` = ? LIMIT 1',
    [viewerUuid, targetUuid]
  )
  return rows.length > 0
}

export async function fetchSnippetTags(snippetSid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT t.\`tag_key\`, t.\`name\`
       FROM \`content_tags\` ct
       JOIN \`tags\` t ON t.\`sid\` = ct.\`tag_sid\`
      WHERE ct.\`content_sid\` = ?
      ORDER BY t.\`name\``,
    [snippetSid]
  )
  return rows.map(row => ({ key: row.tag_key as string, name: row.name as string }))
}

export async function fetchSnippetDependencies(snippetSid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`logo_url\`
       FROM \`snippet_dependencies\` sd
       JOIN \`dependencies\` d ON d.\`sid\` = sd.\`dependency_sid\`
      WHERE sd.\`snippet_sid\` = ?
      ORDER BY d.\`name\``,
    [snippetSid]
  )
  return rows.map(row => ({
    slug: row.slug as string,
    name: row.name as string,
    kind: row.kind as string,
    logo_url: row.logo_url as string | null
  }))
}
