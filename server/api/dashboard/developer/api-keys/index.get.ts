// 控制台 · 全站 API Key 列表（只返回前缀，不暴露哈希）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  return await listAdminApiKeys()
})
