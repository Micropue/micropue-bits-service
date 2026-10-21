// 移除粉丝 / 取消关注：按 follows.sid 删除
// 只有关系的两端可以删除：粉丝本人可取消关注，被关注者本人可移除粉丝
export default defineEventHandler(async event => {
  const viewer = await requireAuth(event)
  const sid = String(getQuery(event).sid ?? '').trim()
  if (!sid) throw createError({ statusCode: 400, statusMessage: 'Missing follow id' })

  const [rows] = await useDb().query(
    'SELECT `follower_uuid`, `followee_uuid` FROM `follows` WHERE `sid` = ? LIMIT 1',
    [sid]
  ) as [{ follower_uuid: string, followee_uuid: string }[], unknown]
  const follow = rows[0]
  if (!follow) throw createError({ statusCode: 404, statusMessage: 'Follow not found' })

  if (follow.follower_uuid !== viewer.uuid && follow.followee_uuid !== viewer.uuid) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot remove this follow' })
  }

  await useDb().execute('DELETE FROM `follows` WHERE `sid` = ?', [sid])
  return { ok: true }
})
