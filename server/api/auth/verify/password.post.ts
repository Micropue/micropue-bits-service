// 敏感操作二次验证：当前密码校验通过后发放授权标记（未开启两步验证时使用）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string }>(event)
  await assertPasswordConfirm(event, user, body?.password)
  await grantSensitiveVerify(user.uuid)
  return { ok: true, method: 'password' }
})
