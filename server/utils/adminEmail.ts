import type { RowDataPacket } from 'mysql2/promise'
import { EMAIL_RE } from '#shared/utils/validators'
import { useDb } from './db'
import { sendAdminEmail } from './mail'

export const ADMIN_EMAIL_MAX_RECIPIENTS = 200
export const ADMIN_EMAIL_MAX_BODY = 100_000

export type AdminEmailStatus = 'draft' | 'sent' | 'failed'

export interface AdminEmailInput {
  subject: string
  body: string
  to: string[]
  cc: string[]
  bcc: string[]
}

function parseEmailArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item))
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(item => String(item)) : []
    } catch {
      return []
    }
  }
  return []
}

export function readAdminEmailInput(body: Record<string, unknown>): AdminEmailInput {
  const subject = String(body.subject ?? '').replace(/[\r\n]+/g, ' ').trim()
  const text = String(body.body ?? '')
  if (subject.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Subject must be 200 characters or less', data: { field: 'subject' } })
  }
  if (text.length > ADMIN_EMAIL_MAX_BODY) {
    throw createError({ statusCode: 400, statusMessage: 'Body is too long', data: { field: 'body' } })
  }

  const normalize = (value: unknown, field: string) => {
    const raw = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[\s,;]+/)
        : []
    const emails = [...new Set(raw.map(item => String(item ?? '').trim().toLowerCase()).filter(Boolean))]
    for (const email of emails) {
      if (!EMAIL_RE.test(email) || email.length > 254) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid email: ${email}`,
          data: { field }
        })
      }
    }
    return emails
  }

  const to = normalize(body.to, 'to')
  const cc = normalize(body.cc, 'cc')
  const bcc = normalize(body.bcc, 'bcc')
  if (to.length + cc.length + bcc.length > ADMIN_EMAIL_MAX_RECIPIENTS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many recipients (maximum ${ADMIN_EMAIL_MAX_RECIPIENTS})`,
      data: { field: 'to' }
    })
  }

  return { subject, body: text, to, cc, bcc }
}

export function publicAdminEmail(row: RowDataPacket) {
  const to = parseEmailArray(row.to_emails)
  const cc = parseEmailArray(row.cc_emails)
  const bcc = parseEmailArray(row.bcc_emails)
  return {
    sid: row.sid as string,
    subject: row.subject as string,
    body: (row.body as string | undefined) ?? '',
    to,
    cc,
    bcc,
    status: row.status as AdminEmailStatus,
    error: row.error as string,
    messageId: row.message_id as string | null,
    sentAt: row.sent_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    recipientCount: to.length + cc.length + bcc.length
  }
}

export async function fetchAdminEmail(sid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT * FROM `admin_emails` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  return rows[0] ? publicAdminEmail(rows[0]) : null
}

// 调用 SMTP 并回写发送结果；失败也落库，便于控制台排查
export async function deliverAdminEmail(sid: string, input: AdminEmailInput) {
  try {
    const info = await sendAdminEmail({
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.body
    })
    await useDb().execute(
      `UPDATE \`admin_emails\`
          SET \`status\` = 'sent', \`error\` = '', \`message_id\` = ?, \`sent_at\` = NOW()
        WHERE \`sid\` = ?`,
      [info.messageId ?? null, sid]
    )
    return { status: 'sent' as const, error: '' }
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000)
    await useDb().execute(
      "UPDATE `admin_emails` SET `status` = 'failed', `error` = ? WHERE `sid` = ?",
      [message, sid]
    )
    return { status: 'failed' as const, error: message }
  }
}
