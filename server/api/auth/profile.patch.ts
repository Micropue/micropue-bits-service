// 更新账户基础信息（登录态）：用户名 / 昵称 / 密码，均可选；全部留空等同跳过
// 校验规则统一来自 shared/utils/validators.ts
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ username?: string; nickname?: string; password?: string }>(event)

  let username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : undefined
  if (username === '') username = undefined
  let nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : undefined
  if (nickname === '') nickname = undefined
  const password = typeof body?.password === 'string' && body.password.length > 0 ? body.password : undefined

  if (username === undefined && nickname === undefined && password === undefined) {
    return { ok: true, username: user.username, nickname: user.nickname }
  }

  const updates: string[] = []
  const params: unknown[] = []
  if (username !== undefined) {
    // 用户名一经设置不可修改（注册默认值 = 电子邮件，等于邮箱即视为未设置）
    if (user.username !== user.email) {
      throw createError({ statusCode: 403, statusMessage: 'Username cannot be changed', data: { field: 'username' } })
    }
    if (!isValidUsername(username)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid username', data: { field: 'username' } })
    }
    updates.push('`username` = ?')
    params.push(username)
  }
  if (nickname !== undefined) {
    if (!isValidNickname(nickname)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid nickname', data: { field: 'nickname' } })
    }
    updates.push('`nickname` = ?')
    params.push(nickname)
  }
  if (password !== undefined) {
    // 此处仅用于「首次设置密码」（注册初始化）。已有密码的修改统一走 PATCH /api/auth/password
    // （含当前密码校验 + 1 小时限流），避免绕过限流。
    if (user.password_hash) {
      throw createError({ statusCode: 403, statusMessage: 'Password already set', data: { field: 'password' } })
    }
    if (!isValidPassword(password)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid password', data: { field: 'password' } })
    }
    updates.push('`password_hash` = ?')
    params.push(await hashPassword(password))
  }

  params.push(user.uuid)
  try {
    await useDb().execute(`UPDATE \`users\` SET ${updates.join(', ')} WHERE \`uuid\` = ?`, params)
  } catch (err) {
    // 用户名唯一索引冲突
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'Username is already taken', data: { field: 'username' } })
    }
    throw err
  }

  return { ok: true, username: username ?? user.username, nickname: nickname ?? user.nickname }
})
