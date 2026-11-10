// 编辑开发者应用：仅应用所有者，字段校验与新建一致
export default defineEventHandler(async event => {
  const user = await requireDeveloperUser(event)
  await enforceUserRateLimit(event, user.uuid, 'developer:apps:update', 30, 3600)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<Record<string, unknown>>(event)
  const input = readDeveloperAppInput(body ?? {})
  const app = await updateDeveloperApp(user.uuid, sid, input)
  if (!app) throw createError({ statusCode: 404, statusMessage: 'Application not found' })
  return { app }
})
