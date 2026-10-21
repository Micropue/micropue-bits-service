import type { RowDataPacket } from 'mysql2/promise'

// 编辑代码段分组（本人）：名称/介绍/可见性/标签；slug 不可修改
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const body = await readBody<Record<string, unknown>>(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `kind` = 'group' AND `deleted_at` IS NULL LIMIT 1",
    [user.uuid, slug]
  )
  const current = rows[0]
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

  const fields = readGroupFields(body, user)

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      'UPDATE `contents` SET `name` = ?, `intro` = ?, `visibility` = ? WHERE `sid` = ?',
      [fields.name, fields.intro, fields.visibility, current.sid]
    )
    await replaceContentTags(conn, current.sid, fields.tags)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { group: { slug, name: fields.name, visibility: fields.visibility } }
})
