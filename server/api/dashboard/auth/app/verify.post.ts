// AuthApp 登录：邮箱 + 6 位动态码（与邮箱码登录并列的独立方式）
export default defineEventHandler(async event => {
  const methods = await getAuthMethods()
  if (!methods.app) {
    throw createError({ statusCode: 403, statusMessage: 'Authenticator-app sign-in is disabled' })
  }

  const body = await readBody<{ email?: string; code?: string }>(event)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const code = String(body?.code ?? '').trim()
  const invalid = () => createError({ statusCode: 400, statusMessage: 'Incorrect authenticator code' })
  if (!email || !/^\d{6}$/.test(code)) throw invalid()

  const admin = await fetchAdminByEmail(email)
  // 账号不存在 / 未绑定 AuthApp / 被禁用：一律同一提示，不暴露账号状态
  if (!admin || admin.status !== 'normal' || !admin.totp_secret) throw invalid()

  const { valid, timeStep } = await verifyTotp(decryptSecret(admin.totp_secret), code, await usedTimeStep(admin.uuid))
  if (!valid) throw invalid()

  // 防重放：记录已用时间步，同一 30 秒窗口内的码不能再用
  await rememberTimeStep(admin.uuid, timeStep)

  await issueAdminSession(event, admin)
  return { admin: publicAdmin(admin) }
})

async function usedTimeStep(uuid: string): Promise<number | undefined> {
  const value = await useRedis().get(AUTH_KEYS.consoleTotpStep(uuid))
  return value ? Number(value) : undefined
}

async function rememberTimeStep(uuid: string, timeStep: number) {
  await useRedis().set(AUTH_KEYS.consoleTotpStep(uuid), String(timeStep), 'EX', 120)
}
