import type { RowDataPacket } from 'mysql2/promise'

// 公开分组搜索（指令框 / 完整搜索页共用）：支持空格分隔的多个关键词（AND），命中名称 / 介绍 / 标签
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 50

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const terms = keywordTerms(query.q, 5)
  if (!terms.length) return { groups: [], total: 0, hasMore: false }

  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const params: (string | number)[] = []
  const filters = terms.map(term => groupKeywordCondition(term, params))
  const where = `g.\`kind\` = 'group' AND g.\`deleted_at\` IS NULL AND g.\`visibility\` = 'public'
        AND u.\`status\` = 'normal' AND u.\`username\` <> u.\`email\`
        AND ${filters.join(' AND ')}`
  const db = useDb()

  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE ${where}`,
    params
  )

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`updated_at\`,
            u.\`username\`, u.\`nickname\`,
            (SELECT COUNT(*) FROM \`contents\` s
              WHERE s.\`group_sid\` = g.\`sid\` AND s.\`kind\` = 'snippet'
                AND s.\`deleted_at\` IS NULL AND s.\`visibility\` = 'public') AS \`snippet_count\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE ${where}
      ORDER BY g.\`updated_at\` DESC, g.\`sid\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const total = Number(countRow?.total ?? 0)
  return {
    groups: rows.map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      intro: row.intro as string,
      author: { username: row.username as string, nickname: row.nickname as string },
      snippetCount: Number(row.snippet_count ?? 0)
    })),
    total,
    hasMore: offset + rows.length < total
  }
})
