// 下线指定登录设备：移除其登录校验 token → 该设备 JWT 立即失效（即使尚未过期）
// 当前设备不允许在此下线（应使用「Sign out」）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ id?: string }>(event)
  const id = String(body?.id ?? '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing device id' })

  const target = user.login_devices.find(d => deviceId(d.token) === id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Device not found' })
  if (target.token === user.sessionToken) {
    throw createError({ statusCode: 400, statusMessage: 'Use sign out to end the current device' })
  }

  const devices = user.login_devices.filter(d => d.token !== target.token)
  await useDb().execute('UPDATE `users` SET `login_devices` = ? WHERE `uuid` = ?', [
    JSON.stringify(devices),
    user.uuid
  ])
  return { ok: true, count: devices.length }
})
