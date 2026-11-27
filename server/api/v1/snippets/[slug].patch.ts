// 局部更新代码段；未传字段保持原值，传 slug 可改名并自动登记旧地址
export default defineApiV1Handler(async event => {
  const auth = await requireApiV1(event, 'content:update')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const body = await readApiV1Body(event, [
    'name', 'intro', 'slug', 'language', 'visibility', 'tags', 'dependencies', 'group', 'code'
  ])
  const result = await updateApiSnippet(auth, slug, body)
  return {
    data: result.snippet,
    meta: { previousSlug: result.previousSlug, slugChanged: result.slugChanged }
  }
})
