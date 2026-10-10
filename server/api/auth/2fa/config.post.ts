// 两步验证开关：需登录 + 当前密码校验
// 开启 → 前提是已有可用第二因子（AuthApp / Passkey），并生成一次性恢复码（仅本次返回明文）
// 关闭 → 清空恢复码
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ enabled?: boolean; password?: string }>(event)
  await assertPasswordConfirm(user, body?.password)

  const db = useDb()

  if (body?.enabled) {
    const methods = twoFactorMethods(user)
    if (methods.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Set up a passkey or authenticator app first',
        data: { field: 'methods' }
      })
    }
    const { plain, entries } = generateRecoveryCodes()
    await db.execute('UPDATE `users` SET `two_factor_enabled` = 1, `recovery_codes` = ? WHERE `uuid` = ?', [
      JSON.stringify(entries),
      user.uuid
    ])
    return { ok: true, twoFactorEnabled: true, methods, recoveryCodes: plain }
  }

  await db.execute('UPDATE `users` SET `two_factor_enabled` = 0, `recovery_codes` = JSON_ARRAY() WHERE `uuid` = ?', [
    user.uuid
  ])
  return { ok: true, twoFactorEnabled: false }
})
