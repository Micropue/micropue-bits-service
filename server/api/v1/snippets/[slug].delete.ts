// 软删除代码段
export default defineApiV1Handler(async event => {
  const auth = await requireApiV1(event, 'content:delete')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  await deleteApiSnippet(auth, slug)
  return { data: { ok: true, slug } }
})
