// 删除自己的 Developer App（连带 OAuth 服务与 token）
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:apps:delete', 10, 3600)

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  assertDeveloperDeletePhrase(body)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const ok = await deleteDeveloperApp(sid, user.uuid)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  return { ok: true }
})
