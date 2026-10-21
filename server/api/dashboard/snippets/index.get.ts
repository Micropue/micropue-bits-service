import type { RowDataPacket } from 'mysql2/promise'

// 控制台 · 代码段列表（含已删除，供恢复）
// shortcut: 一次性最多 500 条，客户端表格筛选；内容量更大时改服务端分页
const LIST_LIMIT = 500

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const db = useDb()
  const [[countRow]] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS `count` FROM `contents` WHERE `kind` = 'snippet'"
  )
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT c.\`sid\`, c.\`slug\`, c.\`name\`, c.\`intro\`, c.\`visibility\`, c.\`deleted_at\`,
            c.\`created_at\`, c.\`updated_at\`, c.\`copy_count\`, c.\`fork_count\`, c.\`favorite_count\`,
            u.\`username\`, u.\`nickname\`, u.\`email\`, u.\`github_id\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo\`,
            g.\`slug\` AS \`group_slug\`, g.\`name\` AS \`group_name\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
       LEFT JOIN \`languages\` l ON l.\`sid\` = c.\`language_sid\`
       LEFT JOIN \`contents\` g ON g.\`sid\` = c.\`group_sid\` AND g.\`deleted_at\` IS NULL
      WHERE c.\`kind\` = 'snippet'
      ORDER BY (c.\`deleted_at\` IS NOT NULL) ASC, c.\`updated_at\` DESC
      LIMIT ?`,
    [LIST_LIMIT]
  )
  const total = Number(countRow?.count ?? 0)

  return {
    snippets: rows.map(row => {
      const publicUsername = row.username && row.username !== row.email ? row.username as string : null
      return {
        sid: row.sid as string,
        slug: row.slug as string,
        name: row.name as string,
        intro: row.intro as string,
        visibility: row.visibility as string,
        status: row.deleted_at ? 'deleted' : 'active',
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        nickname: row.nickname as string,
        username: publicUsername,
        email: row.email as string,
        avatarUrl: githubAvatar(row.github_id),
        owner: `${row.nickname} ${publicUsername ?? row.email}`,
        language_slug: row.language_slug as string | null,
        language_name: row.language_name as string | null,
        language_logo: row.language_logo as string | null,
        group_slug: row.group_slug as string | null,
        group_name: row.group_name as string | null,
        copies: Number(row.copy_count ?? 0),
        forks: Number(row.fork_count ?? 0),
        favorites: Number(row.favorite_count ?? 0)
      }
    }),
    total,
    truncated: total > rows.length
  }
})
