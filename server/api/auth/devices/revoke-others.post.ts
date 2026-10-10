// 下线全部其他设备：仅保留当前设备的登录校验 token（当前设备不下线）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const devices = user.login_devices.filter(d => d.token === user.sessionToken)
  const removed = user.login_devices.length - devices.length
  await useDb().execute('UPDATE `users` SET `login_devices` = ? WHERE `uuid` = ?', [
    JSON.stringify(devices),
    user.uuid
  ])
  return { ok: true, removed }
})
