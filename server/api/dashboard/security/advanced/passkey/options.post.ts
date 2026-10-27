import { generateAuthenticationOptions } from '@simplewebauthn/server'

// 高级权限验证：Passkey 第一步（邮箱不可用时的替代方式）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  if (!admin.advanced) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Advanced permission is required for this action',
      data: { code: 'ADVANCED_REQUIRED' }
    })
  }
  if (!admin.passkeys.length) {
    throw createError({ statusCode: 409, statusMessage: 'No passkey is bound to this account' })
  }

  await enforceIpRateLimit(event, 'console:advanced-passkey-options', 60, 600)
  await enforceUserRateLimit(event, admin.uuid, 'admin:advanced:passkey', 20, 3600)

  const { rpID } = rpConfig(event)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: admin.passkeys.map(passkey => ({
      id: passkey.id,
      transports: (passkey.transports ?? []) as never
    }))
  })

  await useRedis().set(AUTH_KEYS.consoleAdvancedWebauthn(admin.uuid), options.challenge, 'EX', 300)
  return { options }
})
