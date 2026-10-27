import type { RowDataPacket } from 'mysql2/promise'

// 控制台 · 代码段处置：软删除 / 恢复（可逆；不改变作者、分组与统计）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ deleted?: unknown }>(event)
  if (typeof body?.deleted !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'deleted must be a boolean' })
  }
  if (body.deleted) await assertAdvancedAccess(admin)

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid` FROM `contents` WHERE `sid` = ? AND `kind` = 'snippet' LIMIT 1",
    [sid]
  )
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  await useDb().execute(
    'UPDATE `contents` SET `deleted_at` = IF(?, NOW(), NULL), `updated_at` = `updated_at` WHERE `sid` = ?',
    [body.deleted, sid]
  )

  return { ok: true, deleted: body.deleted }
})
