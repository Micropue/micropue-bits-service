// 作者收到的代码段反馈（最近 100 条，支持搜索与分页）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const query = getQuery(event)
  return await fetchAccountFeedback(user.uuid, {
    q: String(query.q ?? ''),
    limit: Number(query.limit) || 20,
    offset: Number(query.offset) || 0
  })
})
