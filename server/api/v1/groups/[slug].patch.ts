// 局部更新分组；未传字段保持原值，传 slug 可改名并登记旧地址
export default defineApiV1Handler(async event => {
  const auth = await requireApiV1(event, 'content:update')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const body = await readApiV1Body(event, ['name', 'intro', 'slug', 'visibility', 'tags'])
  const result = await updateApiGroup(auth, slug, body)
  return {
    data: result.group,
    meta: { previousSlug: result.previousSlug, slugChanged: result.slugChanged }
  }
})
