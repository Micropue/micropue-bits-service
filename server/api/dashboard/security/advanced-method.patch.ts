import { ADMIN_ADVANCED_METHODS, type AdminAdvancedMethod } from '#shared/utils/admin'

// 选择高级权限验证方式（安全登录页）：邮箱码始终可用；AuthApp / Passkey 需先绑定
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced-method', 20, 3600)

  const body = await readBody<{ method?: unknown }>(event)
  const method = String(body?.method ?? '')
  if (!(ADMIN_ADVANCED_METHODS as readonly string[]).includes(method)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown verification method' })
  }
  if (method === 'app' && !admin.totp_secret) {
    throw createError({ statusCode: 409, statusMessage: 'Authenticator app is not bound' })
  }
  if (method === 'passkey' && !admin.passkeys.length) {
    throw createError({ statusCode: 409, statusMessage: 'No passkey is bound to this account' })
  }

  await setAdminAdvancedMethod(admin.uuid, method as AdminAdvancedMethod)
  return { method }
})
