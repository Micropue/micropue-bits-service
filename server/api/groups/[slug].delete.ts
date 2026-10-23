import type { RowDataPacket } from 'mysql2/promise'

// 删除代码段分组（本人）：只解除组内代码段的归属，不删除代码段
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'groups:delete', 10, 3600)
  const slug = String(getRouterParam(event, 'slug') ?? '')

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `kind` = 'group' AND `deleted_at` IS NULL LIMIT 1",
    [user.uuid, slug]
  )
  const group = rows[0]
  if (!group) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      "UPDATE `contents` SET `group_sid` = NULL WHERE `group_sid` = ? AND `kind` = 'snippet'",
      [group.sid]
    )
    await conn.execute('UPDATE `contents` SET `deleted_at` = NOW() WHERE `sid` = ?', [group.sid])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { ok: true }
})
