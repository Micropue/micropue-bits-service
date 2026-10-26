import type { RowDataPacket } from 'mysql2/promise'

// 发送一封邮件给单个收件人：前端逐收件人调用，用于显示真实进度
// 只允许发送当前草稿中已有的地址，避免绕过收件人名单
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:emails:recipients', 500, 3600)
  await enforceUserRateLimit(event, admin.uuid, 'admin:emails:recipients-daily', 2000, 86400)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ email?: string }>(event)
  const email = String(body?.email ?? '').trim().toLowerCase()

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT * FROM `admin_emails` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  const row = rows[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Email not found' })

  const record = publicAdminEmail(row)
  if (record.status === 'sent') {
    throw createError({ statusCode: 400, statusMessage: 'Email has already been sent' })
  }
  if (!email || ![...record.to, ...record.cc, ...record.bcc].includes(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Recipient is not part of this email' })
  }

  try {
    await sendAdminEmail({
      to: email,
      subject: record.subject,
      text: record.body
    })
    return { ok: true }
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000)
    return { ok: false, error: message }
  }
})
