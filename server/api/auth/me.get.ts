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
      nickname: user.nickname,
      hasPassword: !!user.password_hash
    }
  }
})
