import type { RowDataPacket } from 'mysql2/promise'

// 逐收件人发送完成后汇总状态；不包含任何收件人地址
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ failed?: number, error?: string }>(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid`, `status` FROM `admin_emails` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Email not found' })
  if (row.status === 'sent') return { email: await fetchAdminEmail(sid) }

  await enforceUserRateLimit(event, admin.uuid, 'admin:emails:send', 10, 3600)

  const failed = Math.max(0, Math.min(Number(body?.failed) || 0, 1000))
  const status = failed > 0 ? 'failed' : 'sent'
  const error = failed > 0
    ? `${failed} recipient(s) failed${body?.error ? `: ${body.error}` : ''}`.slice(0, 1000)
    : ''

  await useDb().execute(
    'UPDATE `admin_emails` SET `status` = ?, `error` = ?, `sent_at` = NOW() WHERE `sid` = ?',
    [status, error, sid]
  )

  return { email: await fetchAdminEmail(sid) }
})
