// OAuth Device Flow：申请 device_code 与 user_code
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:device-code', 30, 3600)

  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const app = await authenticateOAuthClient(event, body)
  if (!app) {
    setResponseStatus(event, 401)
    return { error: 'invalid_client', error_description: 'Invalid client credentials' }
  }
  await enforceRateLimit(event, {
    bucket: 'oauth:device-code-client',
    identity: `client:${app.sid}`,
    limit: 60,
    window: 3600
  })
  if (!app.device_flow) {
    setResponseStatus(event, 400)
    return { error: 'unauthorized_client', error_description: 'Device flow is not enabled for this application' }
  }

  const scope = parseOAuthScope(body.scope)
  const deviceCode = randomToken()
  const userCode = generateUserCode()
  await storeDeviceSession(deviceCode, userCode, {
    appSid: app.sid,
    scope,
    status: 'pending',
    userUuid: null,
    userCode,
    interval: 5
  })

  const base = String(useRuntimeConfig(event).public.siteUrl).replace(/\/+$/, '')
  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `${base}/oauth/device`,
    verification_uri_complete: `${base}/oauth/device?user_code=${encodeURIComponent(userCode)}`,
    expires_in: 900,
    interval: 5
  }
})
