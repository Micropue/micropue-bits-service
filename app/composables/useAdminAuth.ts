import type { AdminAuthMethodKey } from '#shared/utils/admin'

// Bits System Console 前端会话状态：登录管理员 + 认证方式开关（均由服务端接口提供）
// 规范详见 docs-internal/Bits System Console 开发设计规范.md

// 认证方式 UI 元数据（键与 shared/utils/admin.ts 的 ADMIN_AUTH_METHOD_KEYS 一致，类型对齐）
// 文案通过 useConsoleI18n 的 t() 取，支持中英文切换
export const ADMIN_AUTH_METHODS: { key: AdminAuthMethodKey, labelKey: string, hintKey: string }[] = [
  { key: 'email', labelKey: 'method.email.label', hintKey: 'method.email.hint' },
  { key: 'app', labelKey: 'method.app.label', hintKey: 'method.app.hint' },
  { key: 'passkey', labelKey: 'method.passkey.label', hintKey: 'method.passkey.hint' }
]

export interface AdminUser {
  uuid: string
  email: string
  name: string
  // 权限点：逐人配置，不做用户组
  permissions: string[]
  status: string
  last_login_at: string | null
  created_at: string | null
  // 已绑定的登录凭据（服务端只回传状态，不回传密钥/公钥）
  appBound?: boolean
  passkeyCount?: number
}

export type AdminAuthMethods = Record<AdminAuthMethodKey, boolean>

export function useAdminAuth() {
  const user = useState<AdminUser | null>('admin-user', () => null)
  const methods = useState<AdminAuthMethods>('admin-methods', () => ({ email: true, app: true, passkey: true }))
  // SSR 时需带上浏览器 Cookie 才能读到会话
  const request = useRequestFetch()

  async function fetchSession(): Promise<AdminUser | null> {
    try {
      const res = await request<{ admin: AdminUser | null }>('/api/dashboard/auth/me')
      user.value = res.admin
    } catch {
      user.value = null
    }
    return user.value
  }

  async function fetchMethods(): Promise<AdminAuthMethods> {
    const res = await request<{ methods: AdminAuthMethods }>('/api/dashboard/auth/methods')
    methods.value = res.methods
    return res.methods
  }

  async function signOut() {
    await request('/api/dashboard/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, methods, fetchSession, fetchMethods, signOut }
}

// 显示名：填了 name 用 name，否则用邮箱
export function adminDisplayName(admin: { name?: string, email: string } | null | undefined): string {
  return admin?.name?.trim() || admin?.email || ''
}
