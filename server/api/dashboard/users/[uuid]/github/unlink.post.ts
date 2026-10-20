// 解除用户的 GitHub 绑定（用户换号 / GitHub 账号丢失时的救援）
// 邮箱验证码始终可用，解绑不会锁死账号
export default defineEventHandler(async event => {
  await requireAdmin(event)

  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const user = await fetchUserRow(uuid)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  await useDb().execute(
    'UPDATE `users` SET `github_id` = NULL, `github_login` = NULL WHERE `uuid` = ?',
    [uuid]
  )
  const updated = await fetchUserRow(uuid)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { user: publicUserSummary(updated) }
})
