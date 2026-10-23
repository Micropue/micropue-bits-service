import type { RowDataPacket } from 'mysql2/promise'

// 公开代码段搜索（指令框 / 目录页 / 完整搜索页共用）：只返回可公开访问且作者可访问的条目
// 支持空格分隔的多个关键词（AND），每个关键词可命中名称 / 介绍 / 标签 / 依赖 / 语言
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 50

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const terms = keywordTerms(query.q, 5)
  if (!terms.length) return { snippets: [], total: 0, hasMore: false }

  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const params: (string | number)[] = []
  const filters = terms.map(term => snippetKeywordCondition(term, params))
  const where = `c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL AND c.\`visibility\` = 'public'
        AND u.\`status\` = 'normal' AND u.\`username\` <> u.\`email\`
        AND ${filters.join(' AND ')}`
  const db = useDb()

  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE ${where}`,
    params
  )

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`updated_at\`,
            u.\`username\`, u.\`nickname\`,
            l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE ${where}
      ORDER BY c.\`updated_at\` DESC, c.\`sid\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const total = Number(countRow?.total ?? 0)
  return {
    snippets: rows.map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      intro: row.intro as string,
      author: { username: row.username as string, nickname: row.nickname as string },
      language: row.language_name as string | null,
      logoUrl: row.language_logo as string | null
    })),
    total,
    hasMore: offset + rows.length < total
  }
})
