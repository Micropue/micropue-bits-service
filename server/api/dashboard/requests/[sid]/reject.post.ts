import type { RowDataPacket } from 'mysql2/promise'

// 驳回申请：记录原因，供申请人查看 / 后续追溯
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ reason?: string }>(event)
  const reason = String(body?.reason ?? '').trim().slice(0, 500)

  const db = useDb()
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT `status` FROM `catalog_requests` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  if (rows[0].status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'This request has already been reviewed' })
  }

  await db.execute(
    "UPDATE `catalog_requests` SET `status` = 'rejected', `reject_reason` = ?, `reviewed_by` = ?, `reviewed_at` = NOW() WHERE `sid` = ?",
    [reason, admin.uuid, sid]
  )

  return { ok: true }
})
