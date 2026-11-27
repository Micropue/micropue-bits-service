// 新建账号级 API Key，明文 Key 仅在本次响应中返回
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:api-keys:create', 20, 3600)

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  const input = readApiKeyInput(body ?? {})
  return await createApiKey(user.uuid, input)
})
