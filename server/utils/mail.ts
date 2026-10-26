import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(text: string) {
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n{2,}/)
  const body = paragraphs
    .map(paragraph => `<p style="margin: 0 0 14px;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
  return `
    <div style="font-family: Montserrat, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 28px; color: #18181b; font-size: 14px; line-height: 1.7;">
      ${body || '<p style="margin: 0;"></p>'}
    </div>
  `
}

// 控制台邮件：一次只发给一个收件人，避免收件人互相看到地址
export async function sendAdminEmail(options: {
  to: string
  subject: string
  text: string
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  if (!from) throw new Error('SMTP_FROM / SMTP_USER is not configured')
  return await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: textToHtml(options.text)
  })
}

export async function sendVerificationCodeMail(to: string, code: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `${code} is your BITS verification code`,
    text: `Your BITS verification code is ${code}. The code expires in 5 minutes. If you didn't request it, you can safely ignore this email.`,
    html: `
      <div style="font-family: Montserrat, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #18181b;">
        <p style="margin: 0 0 8px;">Your BITS verification code is:</p>
        <p style="margin: 0 0 16px; font-size: 30px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p style="margin: 0; color: #71717a; font-size: 13px;">
          The code expires in 5 minutes. If you didn't request it, you can safely ignore this email.
        </p>
      </div>
    `
  })
}

// 控制台登录码：64 位大小写字母 + 数字，整段连续（便于直接复制粘贴），10 分钟有效
export async function sendAdminCodeMail(to: string, code: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your BITS console sign-in code',
    text: `Your BITS console sign-in code is:\n\n${code}\n\nIt expires in 10 minutes and can be used once. If you didn't request it, someone may be trying to reach the console — you can ignore this email.`,
    html: `
      <div style="font-family: Montserrat, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #18181b;">
        <p style="margin: 0 0 8px;">Your BITS console sign-in code is:</p>
        <p style="margin: 0 0 16px; padding: 12px 14px; border: 1px solid #e4e4e7; border-radius: 10px; background: #fafafa; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; line-height: 22px; letter-spacing: 0.5px; word-break: break-all;">${code}</p>
        <p style="margin: 0; color: #71717a; font-size: 13px;">
          The code expires in 10 minutes and can be used once. If you didn't request it, someone may be trying to reach
          the console — you can ignore this email.
        </p>
      </div>
    `
  })
}
