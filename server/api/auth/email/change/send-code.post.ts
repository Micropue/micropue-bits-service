// 修改邮箱 · 第一步：验证当前密码后，向「新邮箱」发送验证码（每天最多一次）
// 安全要求：需当前密码 + 新邮箱人机校验 + 新邮箱验证码；发码逻辑与登录共用
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string; email?: string; captchaToken?: string }>(event)

  // 需要当前密码才能发起修改（未设置密码 → 409 NO_PASSWORD）
  await assertPasswordConfirm(user, body?.password)

  const email = String(body?.email ?? '').trim().toLowerCase()
  if (email === user.email.toLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: 'This is already your email', data: { field: 'email' } })
  }

  // 每日限额：24 小时内仅能修改一次
  const redis = useRedis()
  const limitTtl = await redis.ttl(AUTH_KEYS.emailChange(user.uuid))
  if (limitTtl > 0) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Email can only be changed once per day',
      data: { field: 'email', retryAfterSeconds: limitTtl }
    })
  }

  // 始终要求人机校验
  return issueEmailCode(event, email, { captchaToken: body?.captchaToken, requireCaptcha: true })
})
