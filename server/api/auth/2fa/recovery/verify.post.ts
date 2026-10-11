// 两步验证 - 恢复码校验（消费一次性码）
export default defineEventHandler(async event => {
  const body = await readBody<{ ticket?: string; code?: string }>(event)
  const ticket = String(body?.ticket ?? '')
  const code = String(body?.code ?? '').trim()
  if (!code) throw createError({ statusCode: 400, statusMessage: 'Please enter a recovery code' })

  const user = await resolveTwoFaTicket(ticket)
  const entries = normalizeRecoveryCodes(user.recovery_codes)
  const { ok, entries: next } = consumeRecoveryCode(entries, code)
  if (!ok) {
    return registerTwoFactorFailure(ticket)
  }

  await useDb().execute('UPDATE `users` SET `recovery_codes` = ? WHERE `uuid` = ?', [JSON.stringify(next), user.uuid])
  await completeTwoFactor(event, ticket, user)
  return { email: user.email, recoveryCodesLeft: countUnusedRecoveryCodes(next) }
})
