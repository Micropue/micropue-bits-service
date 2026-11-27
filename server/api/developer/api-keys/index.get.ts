// 当前用户的 API Key（服务端分页，每页 20；完整 Key 仅在创建时出现一次）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  const page = Math.max(1, Math.trunc(Number(getQuery(event).page) || 1))
  return await listApiKeys(user.uuid, page)
})
