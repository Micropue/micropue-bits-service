import type { RowDataPacket } from 'mysql2/promise'

// 用户主页贡献日历：代码段 / 分组创建 + 提交反馈，按天聚合最近一年
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const user = await findPublicUser(username)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`day\`, SUM(\`count\`) AS \`count\`
       FROM (
         SELECT DATE_FORMAT(\`created_at\`, '%Y-%m-%d') AS \`day\`, COUNT(*) AS \`count\`
           FROM \`contents\`
          WHERE \`owner_uuid\` = ?
            AND \`created_at\` >= DATE_SUB(CURDATE(), INTERVAL 364 DAY)
          GROUP BY DATE_FORMAT(\`created_at\`, '%Y-%m-%d')
         UNION ALL
         SELECT DATE_FORMAT(\`created_at\`, '%Y-%m-%d') AS \`day\`, COUNT(*) AS \`count\`
           FROM \`feedback\`
          WHERE \`user_uuid\` = ?
            AND \`created_at\` >= DATE_SUB(CURDATE(), INTERVAL 364 DAY)
          GROUP BY DATE_FORMAT(\`created_at\`, '%Y-%m-%d')
       ) AS activity
      GROUP BY \`day\`
      ORDER BY \`day\` ASC`,
    [user.uuid, user.uuid]
  )

  const days = rows.map(row => ({
    date: row.day as string,
    count: Number(row.count ?? 0)
  }))

  return {
    days,
    total: days.reduce((sum, day) => sum + day.count, 0)
  }
})
