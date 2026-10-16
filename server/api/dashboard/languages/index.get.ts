import type { RowDataPacket } from 'mysql2/promise'

// 控制台目录数据（只读列表）：编程语言全量 + 被依赖/被使用计数
// 前端 DataTable 自己做筛选/排序/分页（数据量小），这里一次给全
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT l.\`sid\`, l.\`slug\`, l.\`name\`, l.\`logo_url\`, l.\`intro\`, l.\`link_url\`, l.\`sort_order\`, l.\`created_at\`,
            (SELECT COUNT(*) FROM \`dependency_languages\` dl WHERE dl.\`language_sid\` = l.\`sid\`) AS \`dependency_count\`,
            (SELECT COUNT(*) FROM \`contents\` c WHERE c.\`language_sid\` = l.\`sid\` AND c.\`deleted_at\` IS NULL) AS \`content_count\`
       FROM \`languages\` l
      ORDER BY l.\`sort_order\` ASC, l.\`name\` ASC`
  )

  return {
    languages: rows.map(row => ({
      ...row,
      dependency_count: Number(row.dependency_count),
      content_count: Number(row.content_count)
    }))
  }
})
