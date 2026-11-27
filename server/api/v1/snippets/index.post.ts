// 创建代码段：字段与网页编辑器一致，可选 slug
export default defineApiV1Handler(async event => {
  const auth = await requireApiV1(event, 'content:create')
  const body = await readApiV1Body(event, [
    'name', 'intro', 'slug', 'language', 'visibility', 'tags', 'dependencies', 'group', 'code'
  ])
  const result = await createApiSnippet(auth, body)
  setResponseStatus(event, 201)
  return { data: result.snippet, meta: { deduplicated: result.deduplicated } }
})
