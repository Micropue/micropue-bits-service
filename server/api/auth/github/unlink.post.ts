// 解绑当前账户的 GitHub 绑定
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  if (user.github_id) {
    await useDb().execute('UPDATE `users` SET `github_id` = NULL, `github_login` = NULL WHERE `uuid` = ?', [user.uuid])
  }
  return { ok: true, githubLinked: false }
})
