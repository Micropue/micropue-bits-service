// 退出控制台：只失效当前设备的会话
export default defineEventHandler(async event => {
  await revokeAdminSession(event)
  return { ok: true }
})
