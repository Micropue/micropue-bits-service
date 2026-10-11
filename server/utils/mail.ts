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
