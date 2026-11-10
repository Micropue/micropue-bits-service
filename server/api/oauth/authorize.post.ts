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
  const session = await consumeOAuthConsent(consentToken)
  if (!session) throw createError({ statusCode: 410, statusMessage: 'Authorization session expired' })
  if (session.userUuid !== user.uuid) {
    throw createError({ statusCode: 403, statusMessage: 'This authorization request belongs to another account' })
  }

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
