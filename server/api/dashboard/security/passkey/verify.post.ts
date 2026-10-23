import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

// 完成绑定 Passkey：校验注册响应并写入 admins.passkeys
export default defineEventHandler(async event => {
  await enforceIpRateLimit(event, 'console:security-passkey-verify', 20, 600)
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'console:security-passkey', 10, 3600)
  await assertConsoleVerify(admin)

  const body = await readBody<{ response?: RegistrationResponseJSON }>(event)
  if (!body?.response) {
    throw createError({ statusCode: 400, statusMessage: 'Missing registration response' })
  }

  const redis = useRedis()
  const expectedChallenge = await redis.get(AUTH_KEYS.consoleWebauthnReg(admin.uuid))
  if (!expectedChallenge) {
    throw createError({ statusCode: 410, statusMessage: 'Registration session expired' })
  }

  const { rpID, origin } = rpConfig(event)
  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false
    })
  } catch (err) {
    console.error('[console] Passkey 注册校验失败：', err)
    throw createError({ statusCode: 400, statusMessage: 'Passkey registration failed' })
  }
  if (!verification.verified || !verification.registrationInfo) {
    throw createError({ statusCode: 400, statusMessage: 'Passkey registration failed' })
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
  const passkeys = admin.passkeys
  if (passkeys.length >= MAX_PASSKEYS) {
    throw createError({ statusCode: 409, statusMessage: `You can bind up to ${MAX_PASSKEYS} passkeys` })
  }
  if (!passkeys.some(passkey => passkey.id === credential.id)) {
    passkeys.push({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      name: describeUserAgent(getRequestHeader(event, 'user-agent') || ''),
      transports: body.response.response.transports ?? credential.transports,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      createdAt: nowString()
    })
  }
  await saveAdminPasskeys(admin.uuid, passkeys)
  await redis.del(AUTH_KEYS.consoleWebauthnReg(admin.uuid))

  return { count: passkeys.length }
})
