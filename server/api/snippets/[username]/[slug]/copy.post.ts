// 拷贝计数：公开/不可搜索代码段可计数，作者本人可计数私有内容
// 按 IP + 代码段限流 1 次/小时，避免刷新反复抬高数据
export default defineEventHandler(async event => {
  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()

  const user = await findPublicUser(username)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  const snippet = await fetchSnippetBySlug(user.uuid, slug)
  if (!snippet) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  const viewer = await getAuthUser(event)
  const isOwner = viewer?.uuid === user.uuid
  if (snippet.visibility === 'private' && !isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  }

  const key = `copy:${getClientIp(event)}:${snippet.sid}`
  const counted = await useRedis().set(key, '1', 'EX', 3600, 'NX')
  if (counted) {
    await useDb().execute('UPDATE `contents` SET `copy_count` = `copy_count` + 1 WHERE `sid` = ?', [snippet.sid])
  }
  return { counted: !!counted }
})
