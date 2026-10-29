// 代码段 Raw 模式：/{username}/{slug}/raw，直接返回 text/plain
// 可见性规则与公开详情页一致：public / unlisted 可访问，private 仅作者本人
export default defineEventHandler(async event => {
  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()

  const [viewer, user] = await Promise.all([getAuthUser(event), findPublicUser(username)])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const snippet = await fetchSnippetBySlug(user.uuid, slug)
  if (!snippet) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  if (snippet.visibility === 'private' && viewer?.uuid !== user.uuid) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'private, no-store')
  setHeader(event, 'x-content-type-options', 'nosniff')
  setHeader(event, 'x-robots-tag', 'noindex')
  return snippet.code
})
