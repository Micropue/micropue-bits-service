// 高级权限第二步：校验网关动态码；通过后 10 分钟内删除 / 禁用等操作无需再次验证
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  if (!admin.advanced) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Advanced permission is required for this action',
      data: { code: 'ADVANCED_REQUIRED' }
    })
  }
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced:verify', 30, 3600)
  const body = await readBody<{ code?: unknown }>(event)
  return verifyAdvancedCode(admin, body?.code)
})
