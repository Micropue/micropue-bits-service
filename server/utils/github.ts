import type { H3Event } from 'h3'

// GitHub OAuth 辅助：回调地址推导、code 换 token、拉取用户资料
// 环境变量：GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET /（可选）GITHUB_REDIRECT_URI

const GITHUB_UA = 'micropue-bits'

// 回调地址：优先取显式配置，否则按请求来源推导 <origin>/api/auth/github/callback
export function githubRedirectUri(event: H3Event): string {
  const configured = process.env.GITHUB_REDIRECT_URI
  if (configured) return configured
  const url = getRequestURL(event)
  return `${url.origin}/api/auth/github/callback`
}

export function githubConfigured(): boolean {
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
}

interface GithubTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

// 用授权码换取 access_token（form-urlencoded；redirect_uri 须与授权请求一致）
export async function exchangeGithubCode(code: string, redirectUri: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID as string,
    client_secret: process.env.GITHUB_CLIENT_SECRET as string,
    code,
    redirect_uri: redirectUri
  })
  let res: GithubTokenResponse
  try {
    res = await $fetch<GithubTokenResponse>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'User-Agent': GITHUB_UA },
      body
    })
  } catch (err) {
    // 非 2xx：尽量取出 GitHub 返回的 error / error_description 便于定位
    const detail = (err as { data?: GithubTokenResponse })?.data
    const msg = detail?.error_description || detail?.error || (err as Error)?.message || 'GitHub authorization failed'
    throw createError({ statusCode: 502, statusMessage: msg })
  }
  if (!res.access_token) {
    throw createError({ statusCode: 502, statusMessage: res.error_description || res.error || 'GitHub authorization failed' })
  }
  return res.access_token
}

export interface GithubProfile {
  id: number
  login: string
  email: string | null
}

// 拉取 GitHub 用户资料；邮箱为空时回退到「主邮箱且已验证」的邮箱
export async function fetchGithubProfile(token: string): Promise<GithubProfile> {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': GITHUB_UA }
  const profile = await $fetch<{ id: number; login: string; email: string | null }>('https://api.github.com/user', {
    headers
  })
  let email = profile.email
  if (!email) {
    const emails = await $fetch<{ email: string; primary: boolean; verified: boolean }[]>(
      'https://api.github.com/user/emails',
      { headers }
    ).catch(() => [])
    email = emails.find(e => e.primary && e.verified)?.email ?? emails.find(e => e.verified)?.email ?? null
  }
  return { id: profile.id, login: profile.login, email: email ? email.toLowerCase() : null }
}
