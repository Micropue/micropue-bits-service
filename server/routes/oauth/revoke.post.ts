// OAuth Token Revocation：撤销 access / refresh token
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:revoke', 60, 60)
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const app = await authenticateOAuthClient(event, body)
  if (!app) {
    setResponseStatus(event, 401)
    return { error: 'invalid_client', error_description: 'Invalid client credentials' }
  }

  const token = String(body.token ?? '')
  if (token) await revokeOAuthToken(token, app.sid)
  setResponseStatus(event, 200)
  return {}
})
