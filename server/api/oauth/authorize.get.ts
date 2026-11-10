// OAuth 授权第一步：校验客户端与 redirect_uri，返回授权页所需信息
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:authorize', 60, 600)
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  assertOAuthAccountReady(user)
  await enforceUserRateLimit(event, user.uuid, 'oauth:authorize', 30, 600)

  const query = getQuery(event)
  const clientId = String(query.client_id ?? '').trim()
  const redirectUri = String(query.redirect_uri ?? '').trim()
  const responseType = String(query.response_type ?? '').trim()
  const state = query.state === undefined ? undefined : String(query.state)
  const codeChallenge = query.code_challenge ? String(query.code_challenge) : undefined
  const codeChallengeMethod = query.code_challenge_method ? String(query.code_challenge_method) : 'plain'

  if (!clientId || !redirectUri) {
    throw createError({ statusCode: 400, statusMessage: 'client_id and redirect_uri are required' })
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
  if (codeChallenge && codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
    return redirectError('invalid_request', 'Unsupported code_challenge_method')
  }

  let scope: string
  try {
    scope = parseOAuthScope(query.scope)
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
