// 当前用户已授权的 OAuth 应用
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  await enforceUserRateLimit(event, user.uuid, 'oauth:authorizations:list', 60, 3600)
  return { applications: await listUserAuthorizations(user.uuid) }
})
