// 撤销自己的 API Key；已撤销的 Key 不可再次使用
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:api-keys:revoke', 60, 3600)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const ok = await revokeApiKey(user.uuid, sid)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'API key not found' })
  return { ok: true }
})
