// 当前用户的 API Key（只返回前缀，完整 Key 仅在创建时出现一次）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  return await listApiKeys(user.uuid)
})
