import type { RowDataPacket } from 'mysql2/promise'

// 控制台邮件列表：草稿 / 已发送 / 失败
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  const query = getQuery(event)
  const status = query.status === 'draft' || query.status === 'sent' || query.status === 'failed' ? query.status : ''
  const params: string[] = []
  const where = status ? 'WHERE `status` = ?' : ''
  if (status) params.push(status)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`sid\`, \`subject\`, \`to_emails\`, \`cc_emails\`, \`bcc_emails\`, \`status\`, \`error\`,
            \`message_id\`, \`sent_at\`, \`created_at\`, \`updated_at\`
       FROM \`admin_emails\` ${where} ORDER BY \`created_at\` DESC LIMIT 500`,
    params
  )
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || ''
  return {
    from,
    configured: !!from,
    emails: rows.map(publicAdminEmail)
  }
})
