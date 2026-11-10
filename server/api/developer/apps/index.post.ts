// 新建开发者应用：Application name / Homepage URL / 可选 Icon URL / Application description
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:apps:create', 10, 3600)

  const body = await readBody<Record<string, unknown>>(event)
  const input = readDeveloperAppInput(body ?? {})
  return { app: await createDeveloperApp(user.uuid, input) }
})
