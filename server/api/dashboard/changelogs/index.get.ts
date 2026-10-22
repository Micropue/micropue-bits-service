import type { RowDataPacket } from 'mysql2/promise'

// 控制台更新日志列表（含草稿）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`sid\`, \`title\`, \`body\`, \`published_at\`, \`created_at\`, \`updated_at\`
       FROM \`changelogs\`
      ORDER BY \`created_at\` DESC
      LIMIT 500`
  )
  return {
    entries: rows.map(row => ({
      sid: row.sid as string,
      title: row.title as string,
      body: row.body as string,
      published: !!row.published_at,
      publishedAt: row.published_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }))
  }
})
