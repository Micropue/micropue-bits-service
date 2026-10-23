// 重新生成恢复码：需登录 + 当前密码校验；旧码全部作废
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'auth:2fa-recovery-regenerate', 3, 3600)
  const body = await readBody<{ password?: string }>(event)
  await assertSensitiveConfirm(event, user, body?.password)

  if (!user.two_factor_enabled) {
    throw createError({ statusCode: 400, statusMessage: 'Two-step authentication is not enabled' })
  }

  const { plain, entries } = generateRecoveryCodes()
  await useDb().execute('UPDATE `users` SET `recovery_codes` = ? WHERE `uuid` = ?', [
    JSON.stringify(entries),
    user.uuid
  ])
  return { ok: true, recoveryCodes: plain }
})
