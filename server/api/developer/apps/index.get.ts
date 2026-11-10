// 当前用户创建的开发者应用（分页，默认每页 20）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
  const offset = Math.max(Number(query.offset) || 0, 0)
  return await listDeveloperApps(user.uuid, { limit, offset })
})
