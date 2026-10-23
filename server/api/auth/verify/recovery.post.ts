// 敏感操作二次验证：恢复码校验通过后发放授权标记（一次性消费）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceIpRateLimit(event, 'auth:verify-recovery', 30, 3600)
  const body = await readBody<{ code?: string }>(event)
  const code = String(body?.code ?? '').trim()
  if (!code) throw createError({ statusCode: 400, statusMessage: 'Please enter a recovery code' })

  await assertRecoveryNotLocked(user.uuid)
  const entries = normalizeRecoveryCodes(user.recovery_codes)
  const { ok, entries: next } = consumeRecoveryCode(entries, code)
  if (!ok) {
    await registerRecoveryFailure(event, user.uuid)
    throw createError({ statusCode: 403, statusMessage: 'Invalid recovery code', data: { field: 'code' } })
  }

  await useDb().execute('UPDATE `users` SET `recovery_codes` = ? WHERE `uuid` = ?', [
    JSON.stringify(next),
    user.uuid
  ])
  await clearRecoveryFailure(user.uuid)
  await grantSensitiveVerify(user.uuid)
  return { ok: true, method: 'recovery', recoveryCodesLeft: countUnusedRecoveryCodes(next) }
})
