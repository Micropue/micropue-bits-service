import type { RowDataPacket } from 'mysql2/promise'

// 收藏公开 / 不可搜索内容（代码段或分组）；私有内容不可收藏
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'content:favorite', 120, 3600)
  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()
  const owner = await findPublicUser(username)
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`sid\`, \`visibility\` FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`slug\` = ? AND \`deleted_at\` IS NULL LIMIT 1`,
    [owner.uuid, slug]
  )
  const content = rows[0]
  if (!content || content.visibility === 'private') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const count = await setFavorite(user.uuid, content.sid as string, true)
  return { favorited: true, count }
})
