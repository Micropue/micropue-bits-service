import type { RowDataPacket } from 'mysql2/promise'

// 控制台 · 代码段详情（含代码、标签、依赖；仅管理员）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`code\`, c.\`visibility\`, c.\`deleted_at\`,
            c.\`created_at\`, c.\`updated_at\`, c.\`copy_count\`, c.\`fork_count\`, c.\`favorite_count\`,
            u.\`username\`, u.\`nickname\`, u.\`email\`, u.\`github_id\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`,
            g.\`slug\` AS \`group_slug\`, g.\`name\` AS \`group_name\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
       LEFT JOIN \`contents\` g ON g.\`sid\` = c.\`group_sid\` AND g.\`deleted_at\` IS NULL
      WHERE c.\`sid\` = ? AND c.\`kind\` = 'snippet'
      LIMIT 1`,
    [sid]
  )
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  const [tags, dependencies] = await Promise.all([
    fetchSnippetTags(sid),
    fetchSnippetDependencies(sid)
  ])

  return {
    snippet: {
      sid: row.sid,
      slug: row.slug,
      name: row.name,
      intro: row.intro,
      code: row.code,
      visibility: row.visibility,
      status: row.deleted_at ? 'deleted' : 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        nickname: row.nickname,
        username: row.username && row.username !== row.email ? row.username : null,
        email: row.email,
        avatarUrl: githubAvatar(row.github_id)
      },
      language: row.language_slug
        ? { slug: row.language_slug, name: row.language_name, logo_url: row.language_logo }
        : null,
      group: row.group_slug ? { slug: row.group_slug, name: row.group_name } : null,
      copies: Number(row.copy_count ?? 0),
      forks: Number(row.fork_count ?? 0),
      favorites: Number(row.favorite_count ?? 0),
      tags,
      dependencies
    }
  }
})
