// 设备流授权页：允许 / 拒绝设备登录
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  assertOAuthAccountReady(user)
  await enforceUserRateLimit(event, user.uuid, 'oauth:device', 30, 600)
  await enforceIpRateLimit(event, 'oauth:device-approve', 30, 3600)

  const body = await readBody<{ userCode?: string, decision?: string }>(event)
  const userCode = normalizeUserCode(body?.userCode)
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter the code shown on your device' })
  }

  const found = await getDeviceSessionByUserCode(userCode)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'This code is invalid or has expired' })
  if (found.session.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'This code has already been handled' })
  }

  if (body?.decision === 'allow') {
    await updateDeviceSession(found.deviceCode, {
      ...found.session,
      status: 'approved',
      userUuid: user.uuid
    })
    return { status: 'approved' }
  }

  await updateDeviceSession(found.deviceCode, {
    ...found.session,
    status: 'denied',
    userUuid: null
  })
  return { status: 'denied' }
})
