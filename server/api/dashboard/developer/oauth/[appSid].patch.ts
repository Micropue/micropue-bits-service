// 控制台 · 暂停 / 恢复 OAuth 服务；暂停会撤销其全部 token
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:developer:oauth-status', 30, 3600)
  assertAdvancedPermission(admin)

  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  const body = await readBody<{ status?: string }>(event)
  const status = String(body?.status ?? '')
  if (status !== 'active' && status !== 'suspended') {
    throw createError({ statusCode: 400, statusMessage: 'Unknown status' })
  }
  if (status === 'suspended') await assertAdvancedAccess(admin)

  const ok = await updateOAuthServiceStatus(appSid, status)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'OAuth service not found' })
  if (status === 'suspended') await revokeAppTokens(appSid)
  return { ok: true, status }
})
