import type { RowDataPacket } from 'mysql2/promise'

// 公开分组搜索（指令框）：支持空格分隔的多个关键词（AND），命中名称 / 介绍 / 标签
const LIMIT = 8

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const terms = keywordTerms(getQuery(event).q, 5)
  if (!terms.length) return { groups: [] }

  const params: (string | number)[] = []
  const filters = terms.map(term => groupKeywordCondition(term, params))
  params.push(LIMIT)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`updated_at\`,
            u.\`username\`, u.\`nickname\`,
            (SELECT COUNT(*) FROM \`contents\` s
              WHERE s.\`group_sid\` = g.\`sid\` AND s.\`kind\` = 'snippet'
                AND s.\`deleted_at\` IS NULL AND s.\`visibility\` = 'public') AS \`snippet_count\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE g.\`kind\` = 'group' AND g.\`deleted_at\` IS NULL AND g.\`visibility\` = 'public'
        AND u.\`status\` = 'normal' AND u.\`username\` <> u.\`email\`
        AND ${filters.join(' AND ')}
      ORDER BY g.\`updated_at\` DESC
      LIMIT ?`,
    params
  )

  return {
    groups: rows.map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      intro: row.intro as string,
      author: { username: row.username as string, nickname: row.nickname as string },
      snippetCount: Number(row.snippet_count ?? 0)
    }))
  }
})
