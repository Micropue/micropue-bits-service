// OAuth 2.0 Token Endpoint：authorization_code / refresh_token / device_code
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:token', 120, 3600)

  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const app = await authenticateOAuthClient(event, body)
  if (!app) {
    setResponseStatus(event, 401)
    return { error: 'invalid_client', error_description: 'Invalid client credentials' }
  }

  await enforceRateLimit(event, {
    bucket: 'oauth:token-client',
    identity: `client:${app.sid}`,
    limit: 600,
    window: 3600
  })

  const grantType = String(body.grant_type ?? '')

  if (grantType === 'authorization_code') {
    const code = String(body.code ?? '')
    const redirectUri = String(body.redirect_uri ?? '')
    const verifier = String(body.code_verifier ?? '')
    const stored = await readOAuthCode(code)
    const session = stored?.session
    if (!stored || !session || session.appSid !== app.sid || session.redirectUri !== redirectUri) {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }
    }
    if (!redirectUriAllowed(appRedirectUris(app), !!app.allow_wildcard, session.redirectUri)) {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'redirect_uri is no longer registered' }
    }
    if (session.codeChallenge) {
      if (!verifier || !verifyPkce(session.codeChallenge, session.codeChallengeMethod ?? 'plain', verifier)) {
        setResponseStatus(event, 400)
        return { error: 'invalid_grant', error_description: 'PKCE verification failed' }
      }
    }
    const user = await fetchAuthUserByUuid(session.userUuid)
    if (!user || user.status !== 'normal') {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'The authorizing account is unavailable' }
    }
    if (!(await consumeOAuthCode(code, stored.raw))) {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }
    }
    return await issueOAuthTokens(app, session.userUuid, session.scope)
  }

  if (grantType === 'refresh_token') {
    const refreshToken = String(body.refresh_token ?? '')
    const row = await findRefreshToken(refreshToken, app.sid)
    if (!row || row.user_status !== 'normal' || row.expired || row.revoked_at) {
      if (row?.family_id && (row.revoked_at || row.user_status !== 'normal')) {
        await revokeTokenFamily(String(row.family_id))
      }
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Invalid or expired refresh token' }
    }
    if (!(await claimRefreshToken(String(row.sid)))) {
      // 同一个 refresh token 被并发/重复使用：视为泄露，撤销整个令牌家族
      await revokeTokenFamily(String(row.family_id))
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Refresh token has already been used' }
    }
    return await issueOAuthTokens(app, String(row.user_uuid), String(row.scope || ''), String(row.family_id))
  }

  if (grantType === 'urn:ietf:params:oauth:grant-type:device_code') {
    const deviceCode = String(body.device_code ?? '')
    const stored = await readDeviceSession(deviceCode)
    const session = stored?.session
    if (!stored || !session || session.appSid !== app.sid) {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Invalid or expired device code' }
    }
    if (!app.device_flow) {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Device flow is no longer enabled for this application' }
    }
    if (session.status === 'pending') {
      setResponseStatus(event, 400)
      return { error: 'authorization_pending', error_description: 'The user has not approved this request yet' }
    }
    if (session.status === 'denied' || !session.userUuid) {
      await deleteDeviceSession(deviceCode)
      setResponseStatus(event, 400)
      return { error: 'access_denied', error_description: 'The user denied this request' }
    }
    const user = await fetchAuthUserByUuid(session.userUuid)
    if (!user || user.status !== 'normal') {
      await deleteDeviceSession(deviceCode)
      setResponseStatus(event, 400)
      return { error: 'access_denied', error_description: 'The authorizing account is unavailable' }
    }
    if (!(await consumeDeviceSession(deviceCode, stored.raw, session.userCode))) {
      setResponseStatus(event, 400)
      return { error: 'invalid_grant', error_description: 'Invalid or expired device code' }
    }
    return await issueOAuthTokens(app, session.userUuid, session.scope)
  }

  setResponseStatus(event, 400)
  return { error: 'unsupported_grant_type', error_description: 'Unsupported grant type' }
})
