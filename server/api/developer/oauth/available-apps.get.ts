// 可注册 OAuth 服务的 App（尚未注册）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  return { apps: await listAvailableApps(user.uuid) }
})
