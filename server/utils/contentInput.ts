import type { Connection } from 'mysql2/promise'

// 内容写入共用的校验与工具（代码段创建/编辑、分组创建/编辑）
// 规则见 docs-internal/项目综合设计.md「代码段」「代码段分组」

export const MAX_CODE_BYTES = 1024 * 1024
export const MAX_TAGS = 5
export const VISIBILITIES = ['public', 'unlisted', 'private'] as const

// 个人主页私有子页面的静态路径，禁止内容 slug 占用
const RESERVED_CONTENT_SLUGS = new Set(['favorites', 'feedback', 'requests'])

export interface TagInput {
  key: string
  name: string
}

interface Owner {
  uuid: string
  username: string
  email: string
}

export function normalizeTags(value: unknown): TagInput[] {
  if (!Array.isArray(value)) return []
  const unique = new Map<string, string>()
  for (const raw of value) {
    const name = String(raw ?? '').trim().slice(0, 32)
    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32)
    if (!key || unique.has(key)) continue
    unique.set(key, name)
    if (unique.size >= MAX_TAGS) break
  }
  return [...unique].map(([key, name]) => ({ key, name }))
}

export function slugifyContentName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// 目录名在用户内唯一；与历史别名也不能冲突（后续改名重定向用）
// adjusted = 原名生成的 slug 已被占用，实际 URL 追加了 -2 / -3…，用于前端提示
export async function nextContentSlug(
  ownerUuid: string,
  name: string
): Promise<{ slug: string, adjusted: boolean }> {
  const db = useDb()
  const base = slugifyContentName(name) || 'item'
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 36)}-${attempt + 1}`
    if (RESERVED_CONTENT_SLUGS.has(candidate)) continue
    const [[taken]] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM \`contents\` WHERE \`owner_uuid\` = ? AND \`slug\` = ?) +
         (SELECT COUNT(*) FROM \`content_aliases\` WHERE \`owner_uuid\` = ? AND \`slug\` = ?) AS \`count\``,
      [ownerUuid, candidate, ownerUuid, candidate]
    ) as [{ count: number }[], unknown]
    if (!Number(taken?.count ?? 0)) return { slug: candidate, adjusted: attempt > 0 }
  }
  return { slug: `${base.slice(0, 19)}-${shortId()}`, adjusted: true }
}

function assertPublicAllowed(owner: Owner, visibility: string) {
  // 公开 / 不可搜索内容要能通过 /{username}/{slug} 访问：必须先设置用户名
  if (visibility !== 'private' && (!owner.username || owner.username === owner.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Set a username before publishing — it is used in the content URL',
      data: { field: 'username' }
    })
  }
}

export interface SnippetFields {
  name: string
  intro: string
  visibility: string
  code: string
  languageSid: string
  groupSid: string | null
  tags: TagInput[]
  dependencySids: string[]
}

// 代码段字段（创建与编辑共用）：语言必选、依赖必须属于该语言、分组必须属于本人
export async function readSnippetFields(body: Record<string, unknown>, owner: Owner): Promise<SnippetFields> {
  const name = String(body?.name ?? '').trim()
  if (!name || name.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required (max 60 characters)', data: { field: 'name' } })
  }

  const intro = String(body?.intro ?? '').trim()
  if (intro.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Intro is too long (max 500)', data: { field: 'intro' } })
  }

  const visibility = String(body?.visibility ?? 'private')
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown visibility', data: { field: 'visibility' } })
  }
  assertPublicAllowed(owner, visibility)

  const code = String(body?.code ?? '')
  if (!code.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Code is required', data: { field: 'code' } })
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Code is too large (max 1 MB)', data: { field: 'code' } })
  }

  const db = useDb()
  const languageSlug = String(body?.language ?? '').trim().toLowerCase()
  const [languageRows] = await db.query(
    'SELECT `sid` FROM `languages` WHERE `slug` = ? LIMIT 1',
    [languageSlug]
  ) as [{ sid: string }[], unknown]
  const language = languageRows[0]
  if (!language) {
    throw createError({ statusCode: 400, statusMessage: 'Please choose a language', data: { field: 'language' } })
  }

  // 依赖（可选）：必须是所选语言实际关联的条目
  const dependencySlugs = Array.isArray(body?.dependencies)
    ? [...new Set((body.dependencies as unknown[]).map(item => String(item ?? '').trim().toLowerCase()).filter(Boolean))]
    : []
  let dependencySids: string[] = []
  if (dependencySlugs.length) {
    const placeholders = dependencySlugs.map(() => '?').join(', ')
    const [dependencyRows] = await db.query(
      `SELECT d.\`sid\`, d.\`slug\`
         FROM \`dependencies\` d
         JOIN \`dependency_languages\` dl ON dl.\`dependency_sid\` = d.\`sid\`
        WHERE dl.\`language_sid\` = ? AND d.\`slug\` IN (${placeholders})`,
      [language.sid, ...dependencySlugs]
    ) as [{ sid: string, slug: string }[], unknown]
    if (dependencyRows.length !== dependencySlugs.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Some dependencies do not belong to the chosen language',
        data: { field: 'dependencies' }
      })
    }
    const bySlug = new Map(dependencyRows.map(row => [row.slug, row.sid]))
    dependencySids = dependencySlugs.map(slug => bySlug.get(slug)!)
  }

  // 所属分组（可选）：必须是本人未删除的分组
  let groupSid: string | null = null
  const groupSlug = String(body?.group ?? '').trim()
  if (groupSlug) {
    const [groupRows] = await db.query(
      "SELECT `sid` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `kind` = 'group' AND `deleted_at` IS NULL LIMIT 1",
      [owner.uuid, groupSlug]
    ) as [{ sid: string }[], unknown]
    if (!groupRows[0]) {
      throw createError({ statusCode: 400, statusMessage: 'Unknown group', data: { field: 'group' } })
    }
    groupSid = groupRows[0].sid
  }

  return {
    name,
    intro,
    visibility,
    code,
    languageSid: language.sid,
    groupSid,
    tags: normalizeTags(body?.tags),
    dependencySids
  }
}

export interface GroupFields {
  name: string
  intro: string
  visibility: string
  tags: TagInput[]
}

export function readGroupFields(body: Record<string, unknown>, owner: Owner): GroupFields {
  const name = String(body?.name ?? '').trim()
  if (!name || name.length > 60) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required (max 60 characters)', data: { field: 'name' } })
  }
  const intro = String(body?.intro ?? '').trim()
  if (intro.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Intro is too long (max 500)', data: { field: 'intro' } })
  }
  const visibility = String(body?.visibility ?? 'private')
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown visibility', data: { field: 'visibility' } })
  }
  assertPublicAllowed(owner, visibility)
  return { name, intro, visibility, tags: normalizeTags(body?.tags) }
}

// 标签整体替换：先清空关联，再 upsert 并建立关联
export async function replaceContentTags(conn: Connection, contentSid: string, tags: TagInput[]) {
  await conn.execute('DELETE FROM `content_tags` WHERE `content_sid` = ?', [contentSid])
  if (!tags.length) return

  for (const tag of tags) {
    await conn.execute(
      'INSERT INTO `tags` (`sid`, `tag_key`, `name`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `name` = `name`',
      [shortId(), tag.key, tag.name]
    )
  }
  const [tagRows] = await conn.query(
    `SELECT \`sid\`, \`tag_key\` FROM \`tags\` WHERE \`tag_key\` IN (${tags.map(() => '?').join(', ')})`,
    tags.map(tag => tag.key)
  ) as [{ sid: string, tag_key: string }[], unknown]
  const byKey = new Map(tagRows.map(row => [row.tag_key, row.sid]))
  for (const tag of tags) {
    const tagSid = byKey.get(tag.key)
    if (tagSid) {
      await conn.execute(
        'INSERT INTO `content_tags` (`sid`, `content_sid`, `tag_sid`) VALUES (?, ?, ?)',
        [shortId(), contentSid, tagSid]
      )
    }
  }
}

// 依赖整体替换（仅代码段）
export async function replaceSnippetDependencies(conn: Connection, snippetSid: string, dependencySids: string[]) {
  await conn.execute('DELETE FROM `snippet_dependencies` WHERE `snippet_sid` = ?', [snippetSid])
  for (const dependencySid of dependencySids) {
    await conn.execute(
      'INSERT INTO `snippet_dependencies` (`sid`, `snippet_sid`, `dependency_sid`) VALUES (?, ?, ?)',
      [shortId(), snippetSid, dependencySid]
    )
  }
}
