// 读取 Key 所有者的代码段（含私有内容），支持分页、搜索和可见性筛选
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const auth = await requireApiV1(event, 'content:read')
  const { limit, offset } = readPagination(event)
  const query = getQuery(event)
  const result = await listApiSnippets(auth, { limit, offset, q: query.q, visibility: query.visibility })
  return { data: result.snippets, pagination: result.pagination }
})
