// 当前用户注册的 OAuth 服务列表
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  return { services: await listOAuthServices(user.uuid) }
})
