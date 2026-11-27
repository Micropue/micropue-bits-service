// 创建分组：可选 slug
export default defineApiV1Handler(async event => {
  const auth = await requireApiV1(event, 'content:create')
  const body = await readApiV1Body(event, ['name', 'intro', 'slug', 'visibility', 'tags'])
  const result = await createApiGroup(auth, body)
  setResponseStatus(event, 201)
  return { data: result.group, meta: { deduplicated: result.deduplicated } }
})
