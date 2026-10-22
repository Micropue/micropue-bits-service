// 当前账户提交过的举报（最近 100 条，支持搜索与分页）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const query = getQuery(event)
  return await fetchAccountReports(user.uuid, {
    q: String(query.q ?? ''),
    limit: Number(query.limit) || 20,
    offset: Number(query.offset) || 0
  })
})
