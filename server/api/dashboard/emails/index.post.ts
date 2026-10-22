import { shortId } from '../../../utils/id'

// 控制台新建邮件：保存草稿或直接发送
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const action = body.action === 'send' ? 'send' : 'draft'
  const input = readAdminEmailInput(body)

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

  const sid = shortId()
  await useDb().execute(
    `INSERT INTO \`admin_emails\`
       (\`sid\`, \`subject\`, \`body\`, \`to_emails\`, \`cc_emails\`, \`bcc_emails\`, \`status\`, \`created_by\`)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [
      sid,
      input.subject,
      input.body,
      JSON.stringify(input.to),
      JSON.stringify(input.cc),
      JSON.stringify(input.bcc),
      admin.uuid
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
