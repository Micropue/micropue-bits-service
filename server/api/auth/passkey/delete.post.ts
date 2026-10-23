// 删除已绑定的 Passkey：需登录 + 当前密码校验
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'auth:passkey-delete', 10, 3600)
  const body = await readBody<{ password?: string; id?: string }>(event)
  await assertSensitiveConfirm(event, user, body?.password)

  const id = String(body?.id ?? '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing passkey id' })

  const passkeys = normalizePasskeys(user.passkeys)
  const next = passkeys.filter(p => p.id !== id)
  if (next.length !== passkeys.length) {
    await savePasskeys(user.uuid, next)
  }
  return { ok: true, count: next.length }
})
