import { randomUUID } from 'node:crypto'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

// Passkey 登录第一步：不指定账号（discoverable credential），由浏览器弹出已绑定设备的通行密钥
export default defineEventHandler(async event => {
  const methods = await getAuthMethods()
  if (!methods.passkey) {
    throw createError({ statusCode: 403, statusMessage: 'Passkey sign-in is disabled' })
  }

  const { rpID } = rpConfig(event)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: []
  })

  const challengeId = randomUUID()
  await useRedis().set(AUTH_KEYS.consoleWebauthnAuth(challengeId), options.challenge, 'EX', 300)

  return { options, challengeId }
})
