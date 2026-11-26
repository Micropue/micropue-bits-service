// 局部更新分组；未传字段保持原值，传 slug 可改名并登记旧地址
export default defineEventHandler(async event => {
  const auth = await requireApiV1(event, 'content:update')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'JSON body is required' })
  const result = await updateApiGroup(auth, slug, body)
  return {
    data: result.group,
    meta: { previousSlug: result.previousSlug, slugChanged: result.slugChanged }
  }
})
