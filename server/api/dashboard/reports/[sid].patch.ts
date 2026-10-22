import type { RowDataPacket } from 'mysql2/promise'
import { REPORT_STATUSES, type ReportStatus } from '#shared/utils/moderation'

// 控制台更新举报状态 / 处理说明
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ status?: string, result?: string }>(event)
  const status = String(body?.status ?? '')
  if (!REPORT_STATUSES.includes(status as ReportStatus)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid report status', data: { field: 'status' } })
  }
  const result = String(body?.result ?? '').trim()
  if (result.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Result must be 500 characters or less', data: { field: 'result' } })
  }

  const [rows] = await useDb().query<RowDataPacket[]>('SELECT `sid` FROM `reports` WHERE `sid` = ? LIMIT 1', [sid])
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Report not found' })

  await useDb().execute(
    `UPDATE \`reports\`
        SET \`status\` = ?, \`result\` = ?, \`handler_uuid\` = ?, \`handled_at\` = ?
      WHERE \`sid\` = ?`,
    [status, result, status === 'pending' ? null : admin.uuid, status === 'pending' ? null : new Date(), sid]
  )
  return { ok: true, status }
})
