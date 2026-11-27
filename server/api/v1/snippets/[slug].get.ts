// 读取 Key 所有者的单个代码段（含代码正文）
export default defineApiV1Handler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const auth = await requireApiV1(event, 'content:read')
  const slug = String(getRouterParam(event, 'slug') ?? '')
  return { data: await getApiSnippet(auth, slug) }
})
