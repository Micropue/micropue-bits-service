// 下线登录设备：传 id 只下线该设备，不传则全部下线
// id 是设备 token 的短哈希（与站点侧 /api/auth/devices 一致），token 原文不经过接口
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:users:session-revoke', 50, 3600)

  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const body = await readBody<{ id?: string }>(event)
  const id = String(body?.id ?? '')

  const user = await fetchUserRow(uuid)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const devices = normalizeDevices(user.login_devices)
  let next = devices
  if (id) {
    const target = devices.find(device => deviceId(device.token) === id)
    if (!target) throw createError({ statusCode: 404, statusMessage: 'Device not found' })
    next = devices.filter(device => device.token !== target.token)
  } else {
    next = []
  }

  await useDb().execute('UPDATE `users` SET `login_devices` = ? WHERE `uuid` = ?', [JSON.stringify(next), uuid])
  return { ok: true, count: next.length }
})
