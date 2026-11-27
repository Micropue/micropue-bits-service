// 当前用户注册的 OAuth 服务列表（服务端分页，每页 20）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  const page = Math.max(1, Math.trunc(Number(getQuery(event).page) || 1))
  return await listOAuthServices(user.uuid, page)
})
