import type { RowDataPacket } from 'mysql2/promise'

// 目录页（语言 / 依赖）下方的分组列表：只返回公开、且组内至少有一个公开代码段使用该目录项的分组
// 搜索关键词命中分组名称 / 介绍 / 标签
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
  const snippetConditions = [
    "s.`kind` = 'snippet'",
    's.`deleted_at` IS NULL',
    "s.`visibility` = 'public'"
  ]
  const snippetParams: (string | number)[] = []

  if (languageSlug) {
    const [languageRows] = await db.query<RowDataPacket[]>(
      'SELECT `sid` FROM `languages` WHERE `slug` = ? LIMIT 1',
      [languageSlug]
    )
    if (!languageRows[0]) throw createError({ statusCode: 404, statusMessage: 'Language not found' })
    snippetConditions.push('s.`language_sid` = ?')
    snippetParams.push(languageRows[0].sid as string)
  }

  if (dependencySlug) {
    const [dependencyRows] = await db.query<RowDataPacket[]>(
      'SELECT `sid` FROM `dependencies` WHERE `slug` = ? LIMIT 1',
      [dependencySlug]
    )
    if (!dependencyRows[0]) throw createError({ statusCode: 404, statusMessage: 'Dependency not found' })
    snippetConditions.push('EXISTS (SELECT 1 FROM `snippet_dependencies` sd WHERE sd.`snippet_sid` = s.`sid` AND sd.`dependency_sid` = ?)')
    snippetParams.push(dependencyRows[0].sid as string)
  }

  const params: (string | number)[] = [...snippetParams]
  const groupFilters = terms.map(term => groupKeywordCondition(term, params))
  const where = [
    "g.`kind` = 'group'",
    'g.`deleted_at` IS NULL',
    "g.`visibility` = 'public'",
    "u.`status` = 'normal'",
    'u.`username` <> u.`email`',
    `EXISTS (SELECT 1 FROM \`contents\` s WHERE s.\`group_sid\` = g.\`sid\` AND ${snippetConditions.join(' AND ')})`,
    ...groupFilters
  ].join(' AND ')

  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE ${where}`,
    params
  )
  const total = Number(countRow?.total ?? 0)

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT g.\`sid\`, g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`updated_at\`,
            u.\`username\`, u.\`nickname\`, u.\`github_id\`,
            (SELECT COUNT(*) FROM \`contents\` s2
              WHERE s2.\`group_sid\` = g.\`sid\` AND s2.\`kind\` = 'snippet'
                AND s2.\`deleted_at\` IS NULL AND s2.\`visibility\` = 'public') AS \`snippet_count\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE ${where}
      ORDER BY g.\`updated_at\` DESC
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
      snippetCount: Number(row.snippet_count ?? 0),
      author: {
        username: row.username as string,
        nickname: row.nickname as string,
        avatarUrl: githubAvatar(row.github_id)
      },
      tags: tagsBySid.get(row.sid as string) ?? []
    })),
    hasMore: offset + rows.length < total
  }
})
