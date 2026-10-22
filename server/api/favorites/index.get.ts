// 当前账户的收藏列表（代码段 / 分组）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const query = getQuery(event)
  const kind = query.kind === 'group' ? 'group' : 'snippet'

  return await fetchFavorites(user.uuid, kind, {
    q: String(query.q ?? ''),
    limit: Number(query.limit) || 12,
    offset: Number(query.offset) || 0
  })
})
