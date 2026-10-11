// 发送邮箱验证码（登录用）：核心逻辑见 server/utils/emailCode.ts
export default defineEventHandler(async event => {
  const body = await readBody<{ email?: string; captchaToken?: string }>(event)
  return issueEmailCode(event, body?.email ?? '', {
    captchaToken: body?.captchaToken,
    requireCaptcha: false
  })
})
