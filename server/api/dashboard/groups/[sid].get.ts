import type { RowDataPacket } from 'mysql2/promise'

// 控制台 · 分组详情（含组内代码段，仅管理员）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const db = useDb()
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT g.\`sid\`, g.\`slug\`, g.\`name\`, g.\`intro\`, g.\`visibility\`, g.\`deleted_at\`,
            g.\`created_at\`, g.\`updated_at\`,
            u.\`username\`, u.\`nickname\`, u.\`email\`, u.\`github_id\`
       FROM \`contents\` g
       JOIN \`users\` u ON u.\`uuid\` = g.\`owner_uuid\`
      WHERE g.\`sid\` = ? AND g.\`kind\` = 'group'
      LIMIT 1`,
    [sid]
  )
  const group = rows[0]
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

  const tags = await fetchSnippetTags(sid)
  const [snippetRows] = await db.query<RowDataPacket[]>(
    `SELECT \`sid\`, \`slug\`, \`name\`, \`deleted_at\`, \`updated_at\`
       FROM \`contents\`
      WHERE \`group_sid\` = ? AND \`kind\` = 'snippet'
      ORDER BY (\`deleted_at\` IS NOT NULL) ASC, \`updated_at\` DESC`,
    [sid]
  )

  return {
    group: {
      sid: group.sid,
      slug: group.slug,
      name: group.name,
      intro: group.intro,
      visibility: group.visibility,
      status: group.deleted_at ? 'deleted' : 'active',
      createdAt: group.created_at,
      updatedAt: group.updated_at,
      author: {
        nickname: group.nickname,
        username: group.username && group.username !== group.email ? group.username : null,
        email: group.email,
        avatarUrl: githubAvatar(group.github_id)
      },
      tags,
      snippets: snippetRows.map(row => ({
        sid: row.sid as string,
        slug: row.slug as string,
        name: row.name as string,
        status: row.deleted_at ? 'deleted' : 'active',
        updatedAt: row.updated_at as string
      }))
    }
  }
})
