// 删除已绑定的 Passkey
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'console:passkey-delete', 10, 3600)
  await assertConsoleVerify(admin)

  const body = await readBody<{ id?: string }>(event)
  const id = String(body?.id ?? '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing passkey id' })

  const next = admin.passkeys.filter(passkey => passkey.id !== id)
  if (next.length !== admin.passkeys.length) {
    await saveAdminPasskeys(admin.uuid, next)
    if (!next.length && admin.advanced_method === 'passkey') {
      await setAdminAdvancedMethod(admin.uuid, 'email')
    }
  }
  return { count: next.length }
})
