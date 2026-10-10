// 查询待校验的两步验证票据（GitHub 跳转登录后由前端读回可用第二因子）
export default defineEventHandler(async event => {
  const body = await readBody<{ ticket?: string }>(event)
  const ticket = String(body?.ticket ?? '')
  if (!ticket) throw createError({ statusCode: 400, statusMessage: 'Missing ticket' })

  const raw = await useRedis().get(AUTH_KEYS.twoFaTicket(ticket))
  if (!raw) throw createError({ statusCode: 410, statusMessage: 'Sign-in attempt expired' })

  const { uuid } = JSON.parse(raw) as { uuid: string }
  const user = await fetchAuthUserByUuid(uuid)
  if (!user || user.status !== 'normal') {
    throw createError({ statusCode: 403, statusMessage: 'This account has been disabled' })
  }

  return { account: user.username || user.email, methods: twoFactorMethods(user) }
})
