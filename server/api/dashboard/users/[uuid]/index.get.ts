// 用户详情：账户信息 + 登录方式 + 脱敏登录设备（白名单由 publicUserDetail 负责）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const user = await fetchUserRow(uuid)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  return { user: publicUserDetail(user) }
})
