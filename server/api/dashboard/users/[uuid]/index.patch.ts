// 启用 / 禁用站点账户：只接受 status（normal | disabled）与禁用原因
// 禁用后：所有登录入口都会拒绝（status 检查已覆盖邮箱码 / Passkey / GitHub / 会话读取），
// 并清空 login_devices —— 重新启用后需要重新登录，旧会话不会复活
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:users:update', 30, 3600)

  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const body = await readBody<{ status?: string, reason?: unknown }>(event)
  const status = String(body?.status ?? '')
  if (status !== 'normal' && status !== 'disabled') {
    throw createError({ statusCode: 400, statusMessage: 'Unknown status', data: { field: 'status' } })
  }

  const user = await fetchUserRow(uuid)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  if (status === 'disabled') await assertAdvancedAccess(admin)

  const reason = String(body?.reason ?? '').trim().slice(0, 255)
  const db = useDb()
  if (status === 'disabled') {
    await db.execute(
      "UPDATE `users` SET `status` = 'disabled', `disabled_at` = NOW(), `disabled_by` = ?, `disabled_reason` = ?, `login_devices` = JSON_ARRAY() WHERE `uuid` = ?",
      [admin.uuid, reason, uuid]
    )
  } else {
    await db.execute(
      "UPDATE `users` SET `status` = 'normal', `disabled_at` = NULL, `disabled_by` = NULL, `disabled_reason` = '' WHERE `uuid` = ?",
      [uuid]
    )
  }

  const updated = await fetchUserRow(uuid)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { user: publicUserSummary(updated) }
})
