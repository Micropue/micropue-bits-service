// 编辑 OAuth 服务配置
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:oauth:update', 30, 3600)

  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const input = readOAuthServiceInput(body)
  const service = await updateOAuthService(user.uuid, appSid, input)
  if (!service) throw createError({ statusCode: 404, statusMessage: 'OAuth service not found' })
  return { service }
})
