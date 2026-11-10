// 设备流授权页：查询 user_code 对应的应用与状态
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  assertOAuthAccountReady(user)
  await enforceUserRateLimit(event, user.uuid, 'oauth:device', 30, 600)
  await enforceIpRateLimit(event, 'oauth:device-lookup', 30, 3600)

  const query = getQuery(event)
  const userCode = normalizeUserCode(query.user_code)
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter the code shown on your device' })
  }

  const session = await getDeviceSessionByUserCode(userCode)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'This code is invalid or has expired' })
  const app = await fetchOAuthApp(session.session.appSid)
  if (!app) throw createError({ statusCode: 404, statusMessage: 'This code is invalid or has expired' })

  return {
    userCode,
    status: session.session.status,
    scope: scopeList(session.session.scope).map(value => ({ value, description: OAUTH_SCOPES[value] ?? value })),
    app: {
      name: app.name,
      homepageUrl: app.homepage_url,
      iconUrl: app.icon_url,
      description: app.description
    }
  }
})
