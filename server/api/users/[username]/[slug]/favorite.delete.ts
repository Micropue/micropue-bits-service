import type { RowDataPacket } from 'mysql2/promise'

// 取消收藏（幂等）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()
  const owner = await findPublicUser(username)
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `deleted_at` IS NULL LIMIT 1',
    [owner.uuid, slug]
  )
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const count = await setFavorite(user.uuid, rows[0].sid as string, false)
  return { favorited: false, count }
})
