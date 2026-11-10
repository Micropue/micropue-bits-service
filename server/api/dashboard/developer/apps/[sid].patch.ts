// 控制台 · 暂停 / 恢复 Developer App；暂停会撤销其全部 OAuth token
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:developer:app-status', 30, 3600)
  assertAdvancedPermission(admin)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ status?: string }>(event)
  const status = String(body?.status ?? '')
  if (status !== 'active' && status !== 'suspended') {
    throw createError({ statusCode: 400, statusMessage: 'Unknown status' })
  }
  if (status === 'suspended') await assertAdvancedAccess(admin)

  const ok = await updateDeveloperAppStatus(sid, status)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  if (status === 'suspended') await revokeAppTokens(sid)
  return { ok: true, status }
})
