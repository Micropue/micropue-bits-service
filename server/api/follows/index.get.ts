import type { RowDataPacket } from 'mysql2/promise'

// 粉丝 / 关注列表（公开可看；搜索 + 分页）
// list=followers：谁关注了 {username}；list=following：{username} 关注了谁
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const username = String(query.username ?? '').trim()
  const list = query.list === 'following' ? 'following' : 'followers'
  const user = await findPublicUser(username)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const viewer = await getAuthUser(event)
  const isOwner = viewer?.uuid === user.uuid

  const terms = keywordTerms(query.q, 3)
  const params: (string | number)[] = [user.uuid]
  const filters = terms.map(term => userKeywordCondition(term, params))

  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const join = list === 'followers'
    ? 'JOIN `users` u ON u.`uuid` = f.`follower_uuid`'
    : 'JOIN `users` u ON u.`uuid` = f.`followee_uuid`'
  const anchor = list === 'followers' ? 'f.`followee_uuid`' : 'f.`follower_uuid`'
  const where = [
    `${anchor} = ?`,
    "u.`status` = 'normal'",
    ...filters
  ].join(' AND ')

  const db = useDb()
  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`follows\` f ${join} WHERE ${where}`,
    params
  )
  const total = Number(countRow?.total ?? 0)

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT f.\`sid\`, NULLIF(u.\`username\`, u.\`email\`) AS \`public_username\`,
            u.\`nickname\`, u.\`github_id\`, f.\`created_at\`
       FROM \`follows\` f
       ${join}
      WHERE ${where}
      ORDER BY f.\`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return {
    list,
    isOwner,
    total,
    items: rows.map(row => ({
      sid: row.sid as string,
      username: (row.public_username as string | null) ?? null,
      nickname: row.nickname as string,
      avatarUrl: githubAvatar(row.github_id)
    })),
    hasMore: offset + rows.length < total
  }
})
