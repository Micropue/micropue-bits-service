// 当前管理员的登录凭据状态：邮箱码（恒可用）、AuthApp、Passkey
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const admin = await requireAdmin(event)
  const methods = await getAuthMethods()

  return {
    // 全局开关（关掉的方式，登录页不渲染）
    methods,
    email: admin.email,
    // 身份确认授权是否仍然有效（绑定/解绑前需要）
    verified: await hasConsoleVerify(admin.uuid),
    app: {
      bound: !!admin.totp_secret,
      issuer: totpIssuer(),
      account: admin.email
    },
    passkeys: admin.passkeys.map(passkey => ({
      id: passkey.id,
      name: passkey.name ?? '',
      deviceType: passkey.deviceType ?? 'singleDevice',
      backedUp: !!passkey.backedUp,
      createdAt: passkey.createdAt
    })),
    maxPasskeys: MAX_PASSKEYS
  }
})
