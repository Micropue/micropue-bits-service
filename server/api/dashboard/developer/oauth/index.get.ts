// 控制台 · Developer OAuth 服务列表
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  return { services: await listAdminOAuthServices() }
})
