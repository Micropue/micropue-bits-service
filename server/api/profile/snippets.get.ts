// 个人主页的代码段分页 / 搜索（公开或作者本人）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const username = String(query.username ?? '').trim()
  const [viewer, user] = await Promise.all([getAuthUser(event), findPublicUser(username)])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  return await fetchUserSnippets(user.uuid, viewer?.uuid === user.uuid, {
    q: String(query.q ?? ''),
    limit: Number(query.limit) || 12,
    offset: Number(query.offset) || 0
  })
})
