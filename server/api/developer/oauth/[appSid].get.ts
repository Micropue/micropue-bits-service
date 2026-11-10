// OAuth 服务详情（含 client_secret，仅所有者可见）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  const service = await getOAuthServiceDetail(user.uuid, appSid)
  if (!service) throw createError({ statusCode: 404, statusMessage: 'OAuth service not found' })
  return { service }
})
