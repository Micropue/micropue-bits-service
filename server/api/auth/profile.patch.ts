// 更新账户基础信息（登录态）：昵称 / 密码，均可选；全部留空等同跳过
const NICKNAME_RE = /^[A-Za-z0-9_-]{2,20}$/
const PASSWORD_RE = /^(?=.*[0-9])(?=.*[A-Za-z])[A-Za-z0-9_-]{6,20}$/

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ nickname?: string; password?: string }>(event)

  let nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : undefined
  if (nickname === '') nickname = undefined
  const password = typeof body?.password === 'string' && body.password.length > 0 ? body.password : undefined

  if (nickname === undefined && password === undefined) {
    return { ok: true, nickname: user.nickname }
  }

  const updates: string[] = []
  const params: unknown[] = []
  if (nickname !== undefined) {
    if (!NICKNAME_RE.test(nickname)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid nickname', data: { field: 'nickname' } })
    }
    updates.push('`nickname` = ?')
    params.push(nickname)
  }
  if (password !== undefined) {
    if (!PASSWORD_RE.test(password)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid password', data: { field: 'password' } })
    }
    updates.push('`password_hash` = ?')
    params.push(await hashPassword(password))
  }

  params.push(user.uuid)
  await useDb().execute(`UPDATE \`users\` SET ${updates.join(', ')} WHERE \`uuid\` = ?`, params)

  return { ok: true, nickname: nickname ?? user.nickname }
})
