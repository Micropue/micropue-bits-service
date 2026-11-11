// OAuth 授权第一步：校验客户端与 redirect_uri，返回授权页所需信息
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:authorize', 60, 600)
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  assertOAuthAccountReady(user)
  await enforceUserRateLimit(event, user.uuid, 'oauth:authorize', 30, 600)

  const query = getQuery(event)
  // 重复参数会产生数组，直接视为无效，避免解析歧义
  const rawQuery = (value: unknown) => (Array.isArray(value) ? '' : String(value ?? ''))
  const queryValue = (value: unknown) => rawQuery(value).trim()

  const clientId = queryValue(query.client_id)
  const redirectUri = queryValue(query.redirect_uri)
  const responseType = queryValue(query.response_type)
  const state = rawQuery(query.state) || undefined
  const codeChallenge = queryValue(query.code_challenge) || undefined
  const codeChallengeMethod = queryValue(query.code_challenge_method) || 'plain'

  if (!clientId || clientId.length > 64 || !redirectUri || redirectUri.length > 1024) {
    throw createError({ statusCode: 400, statusMessage: 'client_id and redirect_uri are required' })
  }
  if (state && state.length > 512) {
    throw createError({ statusCode: 400, statusMessage: 'state is too long' })
  }

  const app = await fetchOAuthApp(clientId)
  if (!app) throw createError({ statusCode: 400, statusMessage: 'Unknown OAuth application' })

  const allowed = appRedirectUris(app)
  if (!isSecureOAuthRedirectUri(redirectUri) || !redirectUriAllowed(allowed, !!app.allow_wildcard, redirectUri)) {
    throw createError({ statusCode: 400, statusMessage: 'redirect_uri is not registered for this application' })
  }

  const redirectError = (error: string, description: string) => ({
    redirect: appendOAuthParams(redirectUri, {
      error,
      error_description: description,
      ...(state ? { state } : {})
    })
  })

  if (responseType !== 'code') {
    return redirectError('unsupported_response_type', 'Only response_type=code is supported')
  }
  if (codeChallenge && (codeChallenge.length < 43 || codeChallenge.length > 128 ||
    !/^[A-Za-z0-9\-._~]+$/.test(codeChallenge))) {
    return redirectError('invalid_request', 'Invalid code_challenge')
  }
  if (codeChallenge && codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
    return redirectError('invalid_request', 'Unsupported code_challenge_method')
  }

  const requestedScope = queryValue(query.scope)
  if (requestedScope.length > 512) {
    return redirectError('invalid_scope', 'The requested scope is too long')
  }
  let scope: string
  try {
    scope = parseOAuthScope(requestedScope)
  } catch {
    return redirectError('invalid_scope', 'The requested scope is not supported')
  }

  const consentToken = randomToken()
  await storeOAuthConsent(consentToken, {
    appSid: app.sid,
    userUuid: user.uuid,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod: codeChallenge ? codeChallengeMethod : undefined,
    state
  })

  return {
    app: {
      clientId: app.sid,
      name: app.name,
      homepageUrl: app.homepage_url,
      iconUrl: app.icon_url,
      description: app.description,
      owner: { username: app.owner_username, nickname: app.owner_nickname }
    },
    scopes: scopeList(scope).map(value => ({ value, description: OAUTH_SCOPES[value] ?? value })),
    consentToken,
    redirectUri
  }
})
