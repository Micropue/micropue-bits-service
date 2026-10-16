// 控制台系统配置（需登录）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)
  return {
    authMethods: await getAuthMethods(),
    sessionDays: ADMIN_SESSION_DAYS
  }
})
