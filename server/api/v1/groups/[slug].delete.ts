// 删除分组；组内代码段保留并解除归属
export default defineEventHandler(async event => {
  const auth = await requireApiV1(event, 'content:delete')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  await deleteApiGroup(auth, slug)
  return { data: { ok: true, slug } }
})
