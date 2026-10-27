// 高级权限第一步：向当前管理员邮箱发送 256 个字符的网关动态码（3 分钟有效）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  if (!admin.advanced) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Advanced permission is required for this action',
      data: { code: 'ADVANCED_REQUIRED' }
    })
  }
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced:send', 10, 3600)
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced:send-daily', 30, 86400)
  return issueAdvancedCode(admin)
})
