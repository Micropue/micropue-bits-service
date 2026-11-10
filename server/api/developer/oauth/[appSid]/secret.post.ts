// 重置 OAuth client secret：新 secret 只在本次响应中返回一次
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:oauth:secret-reset', 10, 3600)
  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  const result = await resetOAuthServiceSecret(user.uuid, appSid)
  if (!result) throw createError({ statusCode: 404, statusMessage: 'OAuth service not found' })
  return result
})
