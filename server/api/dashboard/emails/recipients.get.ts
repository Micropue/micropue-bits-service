import type { RowDataPacket } from 'mysql2/promise'

// 邮件收件人选择器：搜索站点用户（邮箱 / 用户名 / 昵称）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  const query = getQuery(event)
  const q = String(query.q ?? '').trim().slice(0, 120)
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const pattern = likePattern(q)
  const where = q
    ? 'WHERE (`email` LIKE ? OR `username` LIKE ? OR `nickname` LIKE ?)'
    : ''
  const params = q ? [pattern, pattern, pattern] : []

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`users\` ${where}`,
    params
  )
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`uuid\`, \`email\`, \`username\`, \`nickname\`, \`github_id\`, \`status\`
       FROM \`users\` ${where}
      ORDER BY \`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return {
    users: rows.map(row => ({
      uuid: row.uuid as string,
      email: row.email as string,
      username: row.username !== row.email ? row.username as string : null,
      nickname: row.nickname as string,
      status: row.status as string,
      avatarUrl: githubAvatar(row.github_id)
    })),
    total: Number(countRow?.total ?? 0)
  }
})
