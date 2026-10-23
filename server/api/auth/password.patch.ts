// 设置 / 修改登录密码（登录态）
// - 尚未设置密码（邮箱验证码注册的账户）：直接设置，无需当前密码
// - 已设置密码：需验证当前密码，且每账户 1 小时内最多修改一次
// - 修改成功后不使其它登录设备失效（会话保持）
const CHANGE_COOLDOWN_SECONDS = 3600

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ currentPassword?: string; newPassword?: string }>(event)

  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  if (!isValidPassword(newPassword)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid password', data: { field: 'password' } })
  }

  const redis = useRedis()
  if (user.password_hash) {
    // 修改（已有密码）：限流 1 小时
    const ttl = await redis.ttl(AUTH_KEYS.passwordChange(user.uuid))
    if (ttl > 0) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Password can only be changed once per hour',
        data: { retryAfterSeconds: ttl }
      })
    }
    // 验证当前密码（已通过两步验证授权则免输）；失败次数由统一校验器限制
    if (!(await hasSensitiveVerify(user.uuid))) {
      await assertPasswordConfirm(event, user, body?.currentPassword)
    }
  }

  await useDb().execute('UPDATE `users` SET `password_hash` = ? WHERE `uuid` = ?', [
    await hashPassword(newPassword),
    user.uuid
  ])

  // 仅在「修改」时写入冷却键（首次设置为非修改操作，不计入限流）
  if (user.password_hash) {
    await redis.set(AUTH_KEYS.passwordChange(user.uuid), '1', 'EX', CHANGE_COOLDOWN_SECONDS)
  }

  return { ok: true, hasPassword: true }
})
