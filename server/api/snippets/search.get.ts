import type { RowDataPacket } from 'mysql2/promise'

// 公开代码段搜索（指令框 / 目录页共用）：只返回可公开访问且作者可访问的条目
// 支持空格分隔的多个关键词（AND），每个关键词可命中名称 / 介绍 / 标签 / 依赖 / 语言
const LIMIT = 8

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const terms = keywordTerms(getQuery(event).q, 5)
  if (!terms.length) return { snippets: [] }

  const params: (string | number)[] = []
  const filters = terms.map(term => snippetKeywordCondition(term, params))
  params.push(LIMIT)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`updated_at\`,
            u.\`username\`, u.\`nickname\`,
            l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
      WHERE c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL AND c.\`visibility\` = 'public'
        AND u.\`status\` = 'normal' AND u.\`username\` <> u.\`email\`
        AND ${filters.join(' AND ')}
      ORDER BY c.\`updated_at\` DESC
      LIMIT ?`,
    params
  )

  return {
    snippets: rows.map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      intro: row.intro as string,
      author: { username: row.username as string, nickname: row.nickname as string },
      language: row.language_name as string | null,
      logoUrl: row.language_logo as string | null
    }))
  }
})
