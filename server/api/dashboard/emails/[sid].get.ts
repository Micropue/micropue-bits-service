// 控制台邮件详情
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const email = await fetchAdminEmail(sid)
  if (!email) throw createError({ statusCode: 404, statusMessage: 'Email not found' })
  return { email }
})
