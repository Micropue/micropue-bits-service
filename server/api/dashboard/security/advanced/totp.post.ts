// 高级权限验证：AuthApp 6 位动态码（邮箱不可用时的替代方式）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  if (!admin.advanced) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Advanced permission is required for this action',
      data: { code: 'ADVANCED_REQUIRED' }
    })
  }
  if (!admin.totp_secret) {
    throw createError({ statusCode: 409, statusMessage: 'Authenticator app is not bound' })
  }

  await enforceIpRateLimit(event, 'console:advanced-totp', 60, 3600)
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced:totp', 30, 3600)
  await assertAdminAppNotLocked(admin.email)

  const body = await readBody<{ code?: unknown }>(event)
  const code = String(body?.code ?? '').trim()
  const invalid = () => createError({ statusCode: 400, statusMessage: 'Incorrect authenticator code' })
  if (!/^\d{6}$/.test(code)) {
    await registerAdminAppFailure(event, admin.email)
    throw invalid()
  }

  const redis = useRedis()
  const used = await redis.get(AUTH_KEYS.consoleTotpStep(admin.uuid))
  const result = await verifyTotp(decryptSecret(admin.totp_secret), code, used ? Number(used) : undefined)
  if (!result.valid) {
    await registerAdminAppFailure(event, admin.email)
    throw invalid()
  }

  // 与登录共用已用时间步：同一 30 秒窗口内的码不能重复使用
  await redis.set(AUTH_KEYS.consoleTotpStep(admin.uuid), String(result.timeStep), 'EX', 120)
  await clearAdminAppFailure(admin.email)
  return grantAdvancedAccess(admin.uuid)
})
