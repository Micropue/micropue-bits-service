import type { RowDataPacket } from 'mysql2/promise'

// 控制台 · 分组处置：软删除 / 恢复
// 与作者删除不同：后台删除不解除组内代码段归属，恢复后分组关系原样回来
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ deleted?: unknown }>(event)
  if (typeof body?.deleted !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'deleted must be a boolean' })
  }
  if (body.deleted) await assertAdvancedAccess(admin)

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid` FROM `contents` WHERE `sid` = ? AND `kind` = 'group' LIMIT 1",
    [sid]
  )
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Group not found' })

  await useDb().execute(
    'UPDATE `contents` SET `deleted_at` = IF(?, NOW(), NULL), `updated_at` = `updated_at` WHERE `sid` = ?',
    [body.deleted, sid]
  )

  return { ok: true, deleted: body.deleted }
})
