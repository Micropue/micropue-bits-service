import type { H3Event } from 'h3'

// 开发模式（MODE=dev）：跳过 hCaptcha 校验，允许虚假/空 token 通过，便于本地无域名调试
function isDevMode(): boolean {
  return process.env.MODE === 'dev'
}

// hCaptcha 服务端校验（siteverify）。
// 未配置 HCAPTCHA_SECRET 时直接跳过，保证未接入的环境仍可运行；配置后强制校验。
export async function verifyHcaptcha(event: H3Event, token: string | undefined): Promise<void> {
  if (isDevMode()) return

  const secret = process.env.HCAPTCHA_SECRET
  if (!secret) return

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Captcha is required', data: { captcha: true } })
  }

  const params = new URLSearchParams({ secret, response: token })
  const ip = getClientIp(event)
  if (ip && ip !== 'unknown') params.set('remoteip', ip)

  let result: { success?: boolean }
  try {
    result = await $fetch<{ success?: boolean }>('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
  } catch (err) {
    console.error('[auth] hCaptcha 校验请求失败：', err)
    throw createError({ statusCode: 502, statusMessage: 'Captcha verification unavailable' })
  }

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Captcha verification failed', data: { captcha: true } })
  }
}
