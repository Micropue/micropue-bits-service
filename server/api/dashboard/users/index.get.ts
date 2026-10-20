import type { RowDataPacket } from 'mysql2/promise'

// 站点用户列表（后台用户管理）：一次最多 500 条，超出时前端提示用搜索/筛选收窄
// shortcut: 客户端表格适合当前规模；用户量破千后改成服务端分页（需扩展 ConsoleDataTable）
const LIST_LIMIT = 500

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const db = useDb()
  const [[countRow]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS `count` FROM `users`')
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${USER_SUMMARY_SQL} FROM \`users\` ORDER BY \`created_at\` DESC LIMIT ?`,
    [LIST_LIMIT]
  )
  const total = Number(countRow?.count ?? 0)

  return { users: rows.map(publicUserSummary), total, truncated: total > rows.length }
})
