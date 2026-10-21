import type { RowDataPacket } from 'mysql2/promise'

// 关注用户（本人操作）：不能关注自己；重复关注幂等
export default defineEventHandler(async event => {
  const viewer = await requireAuth(event)
  const username = String(getRouterParam(event, 'username') ?? '').trim()

  const target = await findPublicUser(username)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (target.uuid === viewer.uuid) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot follow yourself' })
  }

  await useDb().execute(
    'INSERT IGNORE INTO `follows` (`sid`, `follower_uuid`, `followee_uuid`) VALUES (?, ?, ?)',
    [shortId(), viewer.uuid, target.uuid]
  )

  const [[counts]] = await useDb().query<RowDataPacket[]>(
    'SELECT (SELECT COUNT(*) FROM `follows` WHERE `followee_uuid` = ?) AS `followers`, (SELECT COUNT(*) FROM `follows` WHERE `follower_uuid` = ?) AS `following`',
    [target.uuid, target.uuid]
  )
  return { following: true, followers: Number(counts?.followers ?? 0), followingCount: Number(counts?.following ?? 0) }
})
