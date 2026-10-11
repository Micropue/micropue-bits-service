// 解绑当前账户的 GitHub 绑定（需身份认证：密码 / 两步验证）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ password?: string }>(event)
  await assertSensitiveConfirm(user, body?.password)

  if (user.github_id) {
    await useDb().execute('UPDATE `users` SET `github_id` = NULL, `github_login` = NULL WHERE `uuid` = ?', [user.uuid])
  }
  return { ok: true, githubLinked: false }
})
