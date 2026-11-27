// 控制台 · 撤销任意用户的 API Key；撤销后开放 API 立即拒绝该 Key
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:developer:api-key-revoke', 60, 3600)
  assertAdvancedPermission(admin)
  await assertAdvancedAccess(admin)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const ok = await revokeAdminApiKey(sid)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Active API key not found' })
  return { ok: true }
})
