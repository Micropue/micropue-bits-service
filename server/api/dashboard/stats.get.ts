import type { RowDataPacket } from 'mysql2/promise'

// 控制台概览统计（只读）：站点用户数 + 目录基础数据量 + 有效内容数
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const [[counts]] = await useDb().query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM \`users\`) AS \`users\`,
       (SELECT COUNT(*) FROM \`languages\`) AS \`languages\`,
       (SELECT COUNT(*) FROM \`dependencies\`) AS \`dependencies\`,
       (SELECT COUNT(*) FROM \`contents\` WHERE \`kind\` = 'snippet' AND \`deleted_at\` IS NULL) AS \`snippets\`,
       (SELECT COUNT(*) FROM \`contents\` WHERE \`kind\` = 'group' AND \`deleted_at\` IS NULL) AS \`groups\``
  )

  return {
    users: Number(counts.users),
    languages: Number(counts.languages),
    dependencies: Number(counts.dependencies),
    snippets: Number(counts.snippets),
    groups: Number(counts.groups)
  }
})
