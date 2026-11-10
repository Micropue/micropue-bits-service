// 单个应用详情（含 client_id / client_secret，仅所有者可见）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const app = await getDeveloperAppDetail(user.uuid, sid)
  if (!app) throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  return { app }
})
