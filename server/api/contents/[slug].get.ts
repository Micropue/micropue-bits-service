import type { RowDataPacket } from 'mysql2/promise'

// 编辑代码段：读取本人代码段的完整可编辑字段（slug 不可改）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const slug = String(getRouterParam(event, 'slug') ?? '')

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`code\`,
            c.\`group_sid\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`,
            g.\`slug\` AS \`group_slug\`
       FROM \`contents\` c
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
       LEFT JOIN \`contents\` g ON g.\`sid\` = c.\`group_sid\` AND g.\`deleted_at\` IS NULL
      WHERE c.\`owner_uuid\` = ? AND c.\`slug\` = ? AND c.\`kind\` = 'snippet' AND c.\`deleted_at\` IS NULL
      LIMIT 1`,
    [user.uuid, slug]
  )
  const snippet = rows[0]
  if (!snippet) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  const [tagRows] = await useDb().query<RowDataPacket[]>(
    `SELECT t.\`name\` FROM \`content_tags\` ct JOIN \`tags\` t ON t.\`sid\` = ct.\`tag_sid\`
      WHERE ct.\`content_sid\` = ? ORDER BY t.\`name\``,
    [snippet.sid]
  )
  const [dependencyRows] = await useDb().query<RowDataPacket[]>(
    `SELECT d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`logo_url\`
       FROM \`snippet_dependencies\` sd JOIN \`dependencies\` d ON d.\`sid\` = sd.\`dependency_sid\`
      WHERE sd.\`snippet_sid\` = ? ORDER BY d.\`name\``,
    [snippet.sid]
  )

  return {
    snippet: {
      slug: snippet.slug,
      name: snippet.name,
      intro: snippet.intro,
      visibility: snippet.visibility,
      code: snippet.code,
      language: snippet.language_slug
        ? { slug: snippet.language_slug, name: snippet.language_name, logo_url: snippet.language_logo }
        : null,
      group: snippet.group_slug ?? '',
      tags: tagRows.map(row => row.name),
      dependencies: dependencyRows.map(row => ({
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        logo_url: row.logo_url
      }))
    }
  }
})
