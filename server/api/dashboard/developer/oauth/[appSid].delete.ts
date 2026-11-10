// 控制台 · 删除 OAuth 服务（保留 App，连带 token）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:developer:oauth-delete', 20, 3600)
  await assertAdvancedAccess(admin)

  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  const ok = await deleteOAuthService(appSid)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'OAuth service not found' })
  return { ok: true }
})
