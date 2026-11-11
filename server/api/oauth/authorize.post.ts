// OAuth 授权第二步：用户允许/拒绝后签发一次性授权码
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:authorize', 60, 600)
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  assertOAuthAccountReady(user)
  await enforceUserRateLimit(event, user.uuid, 'oauth:authorize', 30, 600)

  const body = await readBody<{ consentToken?: string, decision?: string }>(event)
  const consentToken = String(body?.consentToken ?? '')
  if (!consentToken || consentToken.length > 256) {
    throw createError({ statusCode: 410, statusMessage: 'Authorization session expired' })
  }

  const stored = await readOAuthConsent(consentToken)
  if (!stored) throw createError({ statusCode: 410, statusMessage: 'Authorization session expired' })
  if (stored.session.userUuid !== user.uuid) {
    throw createError({ statusCode: 403, statusMessage: 'This authorization request belongs to another account' })
  }

  // 应用可能已被删除、暂停或改掉 redirect URI，完成授权前重新校验当前配置
  const app = await fetchOAuthApp(stored.session.appSid)
  if (!app) throw createError({ statusCode: 410, statusMessage: 'This application is no longer available' })
  if (!isSecureOAuthRedirectUri(stored.session.redirectUri) ||
    !redirectUriAllowed(appRedirectUris(app), !!app.allow_wildcard, stored.session.redirectUri)) {
    throw createError({ statusCode: 410, statusMessage: 'The redirect URI is no longer registered' })
  }

  // 校验通过后再原子消费，避免同一 token 被并发使用
  if (!(await consumeOAuthConsent(consentToken, stored.raw))) {
    throw createError({ statusCode: 410, statusMessage: 'Authorization session expired' })
  }

  const session = stored.session
  if (body?.decision !== 'allow') {
    return {
      redirect: appendOAuthParams(session.redirectUri, {
        error: 'access_denied',
        ...(session.state ? { state: session.state } : {})
      })
    }
  }

  const code = randomToken()
  await storeOAuthCode(code, {
    appSid: session.appSid,
    userUuid: session.userUuid,
    redirectUri: session.redirectUri,
    scope: session.scope,
    codeChallenge: session.codeChallenge,
    codeChallengeMethod: session.codeChallengeMethod
  })

  return {
    redirect: appendOAuthParams(session.redirectUri, {
      code,
      ...(session.state ? { state: session.state } : {})
    })
  }
})
