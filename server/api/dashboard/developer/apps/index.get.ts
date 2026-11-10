// 控制台 · Developer Apps 列表
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  return { apps: await listAdminDeveloperApps() }
})
