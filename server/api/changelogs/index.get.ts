import type { RowDataPacket } from 'mysql2/promise'

// 公开更新日志：只返回已发布条目，最新在前
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    'SELECT COUNT(*) AS `total` FROM `changelogs` WHERE `published_at` IS NOT NULL'
  )
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`sid\`, \`title\`, \`body\`, \`published_at\`
       FROM \`changelogs\`
      WHERE \`published_at\` IS NOT NULL
      ORDER BY \`published_at\` DESC
      LIMIT ? OFFSET ?`,
    [limit, offset]
  )

  return {
    entries: rows.map(row => ({
      sid: row.sid as string,
      title: row.title as string,
      body: row.body as string,
      publishedAt: row.published_at as string
    })),
    total: Number(countRow?.total ?? 0)
  }
})
