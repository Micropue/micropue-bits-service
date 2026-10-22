import type { RowDataPacket } from 'mysql2/promise'

// 保存作者拖拽排序（只改非置顶项；置顶项始终在顶部）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ kind?: string, slugs?: unknown }>(event)
  const kind = body?.kind === 'group' ? 'group' : 'snippet'
  const slugs = Array.isArray(body?.slugs)
    ? [...new Set(body.slugs.map(value => String(value ?? '').trim()).filter(Boolean))].slice(0, 500)
    : []

  if (!slugs.length) throw createError({ statusCode: 400, statusMessage: 'No content to reorder' })

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`sid\`, \`slug\` FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`kind\` = ? AND \`deleted_at\` IS NULL AND \`pinned_at\` IS NULL`,
    [user.uuid, kind]
  )
  const bySlug = new Map(rows.map(row => [row.slug as string, row.sid as string]))
  if (slugs.some(slug => !bySlug.has(slug))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content order' })
  }

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    for (let index = 0; index < slugs.length; index += 1) {
      await conn.execute(
        'UPDATE `contents` SET `sort_order` = ? WHERE `sid` = ? AND `owner_uuid` = ? AND `pinned_at` IS NULL',
        [(index + 1) * 10, bySlug.get(slugs[index]), user.uuid]
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { ok: true }
})
