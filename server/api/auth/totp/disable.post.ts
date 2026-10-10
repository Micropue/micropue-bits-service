// 解绑 AuthApp：需登录 + 当前密码校验；若两步验证因此再无可用第二因子（无 Passkey），则同步关闭两步验证
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string }>(event)
  await assertPasswordConfirm(user, body?.password)

  const db = useDb()
  await db.execute('UPDATE `users` SET `totp_secret` = NULL WHERE `uuid` = ?', [user.uuid])

  let twoFactorEnabled = !!user.two_factor_enabled
  const hasPasskey = normalizePasskeys(user.passkeys).length > 0
  if (twoFactorEnabled && !hasPasskey) {
    await db.execute('UPDATE `users` SET `two_factor_enabled` = 0, `recovery_codes` = JSON_ARRAY() WHERE `uuid` = ?', [
      user.uuid
    ])
    twoFactorEnabled = false
  }

  return { ok: true, twoFactorEnabled }
})
