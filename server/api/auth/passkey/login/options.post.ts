import { randomUUID } from 'node:crypto'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

// 开始 Passkey 登录：无用户名（discoverable），返回登录选项 + challengeId
export default defineEventHandler(async event => {
  const { rpID } = rpConfig(event)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials: []
  })

  const challengeId = randomUUID()
  await useRedis().set(AUTH_KEYS.webauthnAuth(challengeId), options.challenge, 'EX', 300)

  return { options, challengeId }
})
