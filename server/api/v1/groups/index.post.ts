// 创建分组：可选 slug
export default defineEventHandler(async event => {
  const auth = await requireApiV1(event, 'content:create')
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'JSON body is required' })
  const result = await createApiGroup(auth, body)
  setResponseStatus(event, 201)
  return { data: result.group, meta: { deduplicated: result.deduplicated } }
})
