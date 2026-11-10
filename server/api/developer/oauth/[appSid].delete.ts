// 删除自己的 OAuth 服务（保留 App，连带 token）
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:oauth:delete', 10, 3600)

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  assertDeveloperDeletePhrase(body)

  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  const ok = await deleteOAuthService(appSid, user.uuid)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'OAuth service not found' })
  return { ok: true }
})
