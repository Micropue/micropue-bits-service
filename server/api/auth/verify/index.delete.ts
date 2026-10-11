// 敏感操作二次验证：清除授权标记（弹窗关闭时调用）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await clearSensitiveVerify(user.uuid)
  return { ok: true }
})
