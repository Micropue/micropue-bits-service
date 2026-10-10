import { randomUUID } from 'node:crypto'

// 开始 GitHub OAuth：?mode=login（登录/注册）| link（绑定到当前账户）
export default defineEventHandler(async event => {
  if (!githubConfigured()) {
    throw createError({ statusCode: 500, statusMessage: 'GitHub OAuth is not configured' })
  }

  const mode = getQuery(event).mode === 'link' ? 'link' : 'login'

  let uuid: string | undefined
  if (mode === 'link') {
    const user = await getAuthUser(event)
    if (!user) return sendRedirect(event, '/sign')
    uuid = user.uuid
  }

  const state = randomUUID()
  await useRedis().set(AUTH_KEYS.githubState(state), JSON.stringify({ mode, uuid }), 'EX', 600)

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID as string,
    redirect_uri: githubRedirectUri(event),
    scope: 'read:user user:email',
    state
  })
  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params.toString()}`)
})
