import type { RowDataPacket } from 'mysql2/promise'

// 目录页（语言 / 依赖）下方的代码段列表：只 public，分页 + 关键词搜索
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 30

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const languageSlug = String(query.language ?? '').trim().toLowerCase()
  const dependencySlug = String(query.dependency ?? '').trim().toLowerCase()
  if (!languageSlug && !dependencySlug) {
    throw createError({ statusCode: 400, statusMessage: 'Language or dependency is required' })
  }

  const terms = keywordTerms(query.q, 5)
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const db = useDb()
  const conditions = [
    "c.`kind` = 'snippet'",
    'c.`deleted_at` IS NULL',
    "c.`visibility` = 'public'",
    "u.`status` = 'normal'",
    'u.`username` <> u.`email`'
  ]
  const params: (string | number)[] = []

  if (languageSlug) {
    const [languageRows] = await db.query<RowDataPacket[]>(
      'SELECT `sid` FROM `languages` WHERE `slug` = ? LIMIT 1',
      [languageSlug]
    )
    if (!languageRows[0]) throw createError({ statusCode: 404, statusMessage: 'Language not found' })
    conditions.push('c.`language_sid` = ?')
    params.push(languageRows[0].sid as string)
  }

  if (dependencySlug) {
    const [dependencyRows] = await db.query<RowDataPacket[]>(
      'SELECT `sid` FROM `dependencies` WHERE `slug` = ? LIMIT 1',
      [dependencySlug]
    )
    if (!dependencyRows[0]) throw createError({ statusCode: 404, statusMessage: 'Dependency not found' })
    conditions.push('EXISTS (SELECT 1 FROM `snippet_dependencies` sd WHERE sd.`snippet_sid` = c.`sid` AND sd.`dependency_sid` = ?)')
    params.push(dependencyRows[0].sid as string)
  }

  for (const term of terms) {
    conditions.push(snippetKeywordCondition(term, params))
  }

  const where = conditions.join(' AND ')
  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE ${where}`,
    params
  )
  const total = Number(countRow?.total ?? 0)

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`updated_at\`,
            u.\`username\`, u.\`nickname\`, u.\`github_id\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE ${where}
      ORDER BY c.\`updated_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const withTags = await attachTags(rows.map(row => ({ sid: row.sid as string })))
  const tagsBySid = new Map(withTags.map(item => [item.sid, item.tags]))

  return {
    total,
    items: rows.map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      intro: row.intro as string,
      updatedAt: row.updated_at as string,
      author: {
        username: row.username as string,
        nickname: row.nickname as string,
        avatarUrl: githubAvatar(row.github_id)
      },
      language: row.language_slug
        ? { slug: row.language_slug as string, name: row.language_name as string, logo_url: row.language_logo as string | null }
        : null,
      tags: tagsBySid.get(row.sid as string) ?? []
    })),
    hasMore: offset + rows.length < total
  }
})
