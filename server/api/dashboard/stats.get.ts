import type { RowDataPacket } from 'mysql2/promise'

// 控制台概览统计（只读）：站点用户数 + 目录基础数据量
// 代码段与代码段分组的数据表尚未建设，前端以占位显示，不在这里接
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const [[counts]] = await useDb().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM \`users\`) AS \`users\`,
       (SELECT COUNT(*) FROM \`languages\`) AS \`languages\`,
       (SELECT COUNT(*) FROM \`dependencies\`) AS \`dependencies\``
  )

  return {
    users: Number(counts.users),
    languages: Number(counts.languages),
    dependencies: Number(counts.dependencies)
  }
})
