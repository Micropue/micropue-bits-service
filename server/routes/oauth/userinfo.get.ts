// OAuth UserInfo：Bearer access token
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await enforceIpRateLimit(event, 'oauth:userinfo', 600, 60)
  const header = getRequestHeader(event, 'authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (token) {
    await enforceRateLimit(event, {
      bucket: 'oauth:userinfo-token',
      identity: `token:${hashToken(token)}`,
      limit: 600,
      window: 60
    })
  }
  const row = token ? await findAccessToken(token) : null
  if (!row) {
    setResponseHeader(event, 'www-authenticate', 'Bearer')
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired access token' })
  }

  const scopes = scopeList(String(row.scope ?? ''))
  const username = row.username !== row.email ? String(row.username) : null
  const base = String(useRuntimeConfig(event).public.siteUrl).replace(/\/+$/, '')
  return {
    sub: String(row.uuid),
    username,
    nickname: String(row.nickname ?? ''),
    avatar_url: githubAvatar(row.github_id),
    profile: username ? `${base}/${username}` : null,
    ...(scopes.includes('read:email') ? { email: String(row.email) } : {})
  }
})
