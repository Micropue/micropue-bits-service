import type { RowDataPacket } from 'mysql2/promise'

// 取消关注用户
export default defineEventHandler(async event => {
  const viewer = await requireAuth(event)
  await enforceUserRateLimit(event, viewer.uuid, 'users:follow', 120, 3600)
  const username = String(getRouterParam(event, 'username') ?? '').trim()

  const target = await findPublicUser(username)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  await useDb().execute(
    'DELETE FROM `follows` WHERE `follower_uuid` = ? AND `followee_uuid` = ?',
    [viewer.uuid, target.uuid]
  )

  const [[counts]] = await useDb().query<RowDataPacket[]>(
    'SELECT (SELECT COUNT(*) FROM `follows` WHERE `followee_uuid` = ?) AS `followers`, (SELECT COUNT(*) FROM `follows` WHERE `follower_uuid` = ?) AS `following`',
    [target.uuid, target.uuid]
  )
  return { following: false, followers: Number(counts?.followers ?? 0), followingCount: Number(counts?.following ?? 0) }
})
