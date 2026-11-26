// 读取 Key 所有者的单个分组
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const auth = await requireApiV1(event, 'content:read')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  return { data: await getApiGroup(auth, slug) }
})
