// 更新系统配置：目前只有认证方式开关（热调，立即影响登录页）
export default defineEventHandler(async event => {
  await requireAdmin(event, 'system.config')
  const body = await readBody<{ authMethods?: Partial<AdminAuthMethods> }>(event)
  const current = await getAuthMethods()
  const authMethods = await setAuthMethods({ ...current, ...(body?.authMethods ?? {}) })
  return { authMethods }
})
