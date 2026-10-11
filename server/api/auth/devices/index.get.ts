// 当前账户的登录设备列表（脱敏：不含登录校验 token 原文，仅回传其短哈希）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const devices = user.login_devices
    .map(d => ({
      id: deviceId(d.token),
      name: d.name || d.type || 'Unknown device',
      type: d.type,
      loginAt: d.loginAt,
      current: d.token === user.sessionToken
    }))
    .sort((a, b) => b.loginAt.localeCompare(a.loginAt))

  return { devices, max: MAX_DEVICES }
})
