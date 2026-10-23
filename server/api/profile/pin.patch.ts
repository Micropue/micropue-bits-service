import type { RowDataPacket } from 'mysql2/promise'
import { MAX_PINNED_PER_KIND } from '#shared/utils/moderation'

// 置顶 / 取消置顶自己的代码段或分组
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'profile:pin', 60, 3600)
  const body = await readBody<{ kind?: string, slug?: string, pinned?: boolean }>(event)
  const kind = body?.kind === 'group' ? 'group' : 'snippet'
  const slug = String(body?.slug ?? '').trim()
  const pinned = body?.pinned === true

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`sid\`, \`pinned_at\` FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`slug\` = ? AND \`kind\` = ? AND \`deleted_at\` IS NULL LIMIT 1`,
    [user.uuid, slug, kind]
  )
  const content = rows[0]
  if (!content) throw createError({ statusCode: 404, statusMessage: 'Content not found' })

  const alreadyPinned = !!content.pinned_at
  if (pinned && !alreadyPinned) {
    const [[countRow]] = await useDb().query<RowDataPacket[]>(
      `SELECT COUNT(*) AS \`count\` FROM \`contents\`
        WHERE \`owner_uuid\` = ? AND \`kind\` = ? AND \`deleted_at\` IS NULL AND \`pinned_at\` IS NOT NULL`,
      [user.uuid, kind]
    )
    if (Number(countRow?.count ?? 0) >= MAX_PINNED_PER_KIND) {
      throw createError({
        statusCode: 400,
        statusMessage: `You can pin up to ${MAX_PINNED_PER_KIND} ${kind === 'group' ? 'groups' : 'snippets'}`,
        data: { field: 'pinned', limit: MAX_PINNED_PER_KIND }
      })
    }
  }

  if (pinned !== alreadyPinned) {
    await useDb().execute(
      'UPDATE `contents` SET `pinned_at` = ?, `sort_order` = IF(? = 0, 0, `sort_order`) WHERE `sid` = ?',
      [pinned ? new Date() : null, pinned ? 1 : 0, content.sid]
    )
  }

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`count\` FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`kind\` = ? AND \`deleted_at\` IS NULL AND \`pinned_at\` IS NOT NULL`,
    [user.uuid, kind]
  )
  return { pinned, pinnedCount: Number(countRow?.count ?? 0), maxPinned: MAX_PINNED_PER_KIND }
})
