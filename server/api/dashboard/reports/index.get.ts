// 控制台举报列表：只读，管理员查看举报人、目标与说明
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  const query = getQuery(event)
  return await fetchDashboardReports({
    q: String(query.q ?? ''),
    limit: Number(query.limit) || 500
  })
})
