import type { RowDataPacket } from 'mysql2/promise'

// 用户搜索（公开）：只返回设置了用户名的正常账户（有可访问的主页）
// 支持空格分隔的多个关键词（AND）
const LIMIT = 8

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const terms = keywordTerms(getQuery(event).q, 3)
  if (!terms.length) return { users: [] }

  const params: (string | number)[] = []
  const filters = terms.map(term => userKeywordCondition(term, params))
  params.push(likePattern(terms[0]!), LIMIT)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT u.\`username\`, u.\`nickname\`, u.\`github_id\`
       FROM \`users\` u
      WHERE u.\`status\` = 'normal' AND u.\`username\` <> u.\`email\`
        AND ${filters.join(' AND ')}
      ORDER BY (u.\`username\` LIKE ?) DESC, u.\`nickname\` ASC
      LIMIT ?`,
    params
  )

  return {
    users: rows.map(row => ({
      username: row.username as string,
      nickname: row.nickname as string,
      avatarUrl: githubAvatar(row.github_id)
    }))
  }
})
