import type { RowDataPacket } from 'mysql2/promise'

// 用户搜索（公开）：只返回设置了用户名的正常账户（有可访问的主页）
// 支持空格分隔的多个关键词（AND）；limit/offset 供完整搜索页翻页
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 50

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const terms = keywordTerms(query.q, 3)
  if (!terms.length) return { users: [], total: 0, hasMore: false }

  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const params: (string | number)[] = []
  const filters = terms.map(term => userKeywordCondition(term, params))
  const where = `u.\`status\` = 'normal' AND u.\`username\` <> u.\`email\` AND ${filters.join(' AND ')}`
  const db = useDb()

  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`users\` u WHERE ${where}`,
    params
  )

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.\`username\`, u.\`nickname\`, u.\`github_id\`
       FROM \`users\` u
      WHERE ${where}
      ORDER BY (u.\`username\` LIKE ?) DESC, u.\`nickname\` ASC, u.\`username\` ASC, u.\`uuid\` ASC
      LIMIT ? OFFSET ?`,
    [...params, likePattern(terms[0]!), limit, offset]
  )

  const total = Number(countRow?.total ?? 0)
  return {
    users: rows.map(row => ({
      username: row.username as string,
      nickname: row.nickname as string,
      avatarUrl: githubAvatar(row.github_id)
    })),
    total,
    hasMore: offset + rows.length < total
  }
})
