export interface AuthUser {
  uuid: string
  email: string
  username: string
  usernameSet: boolean
  nickname: string
  hasPassword: boolean
  githubLinked: boolean
  githubLogin: string | null
  githubAvatarUrl: string | null
  passkeyCount: number
  totpEnabled: boolean
  twoFactorEnabled: boolean
  recoveryCodesLeft: number
  status: string
  createdAt: string | null
  lastLoginAt: string | null
}

// 全局登录态：布局初始化（SSR 友好），登录/登出等事件后由页面刷新或清空
export function useAuthUser() {
  const user = useState<AuthUser | null>('auth-user', () => null)

  async function refresh() {
    try {
      const res = await $fetch<{ user: AuthUser }>('/api/auth/me')
      user.value = res.user
    } catch {
      user.value = null
    }
  }

  return { user, refresh }
}
