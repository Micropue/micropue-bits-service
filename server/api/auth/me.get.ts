// DB DATETIME 按东八区返回 Date，格式化为 YYYY-MM-DD HH:mm（北京时间）
function toLocalString(value: string | Date | null): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ')
}

// 当前登录用户信息（未登录 401）
export default defineEventHandler(async event => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  }
  return {
    user: {
      uuid: user.uuid,
      email: user.email,
      username: user.username,
      // 注册默认用户名 = 电子邮件；两者相等即视为「未设置」
      usernameSet: user.username !== user.email,
      nickname: user.nickname,
      hasPassword: !!user.password_hash,
      status: user.status,
      createdAt: toLocalString(user.created_at),
      lastLoginAt: toLocalString(user.last_login_at)
    }
  }
})
