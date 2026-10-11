// 退出登录：移除本设备的登录校验 token 并清除 Cookie（设备下线即 JWT 失效）
export default defineEventHandler(async event => {
  const user = await getAuthUser(event)
  if (user) {
    const devices = user.login_devices.filter(d => d.token !== user.sessionToken)
    await useDb().execute('UPDATE `users` SET `login_devices` = ? WHERE `uuid` = ?', [
      JSON.stringify(devices),
      user.uuid
    ])
  }
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
  return { ok: true }
})
