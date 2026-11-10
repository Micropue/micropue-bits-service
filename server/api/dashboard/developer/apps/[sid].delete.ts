// 控制台 · 删除 Developer App（连带 OAuth 服务与 token）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:developer:app-delete', 20, 3600)
  await assertAdvancedAccess(admin)

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  assertDeveloperDeletePhrase(body)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const ok = await deleteDeveloperApp(sid)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  return { ok: true }
})
