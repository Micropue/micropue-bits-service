// 撤销当前用户对某个 OAuth 应用的全部授权
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  await enforceUserRateLimit(event, user.uuid, 'oauth:authorizations:revoke', 30, 3600)

  const appSid = String(getRouterParam(event, 'appSid') ?? '')
  if (!appSid) throw createError({ statusCode: 400, statusMessage: 'Missing application id' })
  await revokeUserAppTokens(user.uuid, appSid)
  return { ok: true }
})
