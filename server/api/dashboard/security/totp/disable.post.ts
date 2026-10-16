// 解绑 AuthApp：邮箱码始终可用，所以解绑不会锁死账号
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await assertConsoleVerify(admin)

  await setAdminTotpSecret(admin.uuid, null)
  await useRedis().del(AUTH_KEYS.consoleTotpSetup(admin.uuid))
  await useRedis().del(AUTH_KEYS.consoleTotpStep(admin.uuid))
  return { bound: false }
})
