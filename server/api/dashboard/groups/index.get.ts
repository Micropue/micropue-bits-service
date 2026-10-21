import type { RowDataPacket } from 'mysql2/promise'

// 控制台 · 代码段分组列表（含已删除，供恢复）
const LIST_LIMIT = 500

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const db = useDb()
  const [[countRow]] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS `count` FROM `contents` WHERE `kind` = 'group'"
  )
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT g.\`sid\`, g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`visibility\`, g.\`deleted_at\`,
            g.\`created_at\`, g.\`updated_at\`,
            u.\`username\`, u.\`nickname\`, u.\`email\`, u.\`github_id\`,
            (SELECT COUNT(*) FROM \`contents\` s
              WHERE s.\`group_sid\` = g.\`sid\` AND s.\`kind\` = 'snippet' AND s.\`deleted_at\` IS NULL) AS \`snippet_count\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE g.\`kind\` = 'group'
      ORDER BY (g.\`deleted_at\` IS NOT NULL) ASC, g.\`updated_at\` DESC
      LIMIT ?`,
    [LIST_LIMIT]
  )
  const total = Number(countRow?.count ?? 0)

  return {
    groups: rows.map(row => {
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
        snippetCount: Number(row.snippet_count ?? 0)
      }
    }),
    total,
    truncated: total > rows.length
  }
})
