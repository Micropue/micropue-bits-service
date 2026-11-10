// 为已创建的 App 注册 OAuth 服务
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:oauth:create', 10, 3600)

  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const appSid = String(body.appSid ?? '').trim()
  if (!appSid) throw createError({ statusCode: 400, statusMessage: 'Select an application', data: { field: 'appSid' } })

  const input = readOAuthServiceInput(body)
  return { service: await createOAuthService(user.uuid, appSid, input) }
})
