import type { RowDataPacket } from 'mysql2/promise'

// 编辑草稿或发送草稿
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<Record<string, unknown>>(event)
  const action = body.action === 'send' ? 'send' : 'draft'
  const input = readAdminEmailInput(body)

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid`, `status` FROM `admin_emails` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  const current = rows[0]
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Email not found' })
  if (current.status === 'sent') {
    throw createError({ statusCode: 400, statusMessage: 'Sent emails cannot be edited' })
  }

  if (action === 'send' && (!input.to.length || !input.subject || !input.body.trim())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recipients, subject and body are required',
      data: { field: !input.to.length ? 'to' : !input.subject ? 'subject' : 'body' }
    })
  }
  if (action === 'draft' && !input.subject.trim() && !input.body.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Add a subject or body before saving', data: { field: 'subject' } })
  }

  if (action === 'send') {
    await enforceUserRateLimit(event, admin.uuid, 'admin:emails:send', 10, 3600)
    const recipients = input.to.length + input.cc.length + input.bcc.length
    await enforceUserRateLimit(event, admin.uuid, 'admin:emails:recipients', 500, 3600, recipients)
    await enforceUserRateLimit(event, admin.uuid, 'admin:emails:recipients-daily', 2000, 86400, recipients)
  }

  await useDb().execute(
    `UPDATE \`admin_emails\`
        SET \`subject\` = ?, \`body\` = ?, \`to_emails\` = ?, \`cc_emails\` = ?, \`bcc_emails\` = ?,
            \`status\` = 'draft', \`error\` = ''
      WHERE \`sid\` = ?`,
    [
      input.subject,
      input.body,
      JSON.stringify(input.to),
      JSON.stringify(input.cc),
      JSON.stringify(input.bcc),
      sid
    ]
  )

  if (action === 'send') {
    const result = await deliverAdminEmail(sid, input)
    if (result.status === 'failed') {
      throw createError({
        statusCode: 502,
        statusMessage: `Email failed: ${result.error}`,
        data: { sid }
      })
    }
  }

  return { email: await fetchAdminEmail(sid) }
})
