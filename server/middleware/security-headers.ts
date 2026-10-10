// 全站安全响应头：按环境分档，生产额外下发 HSTS
// CSP 因 Nuxt 内联脚本 + dev HMR 需要 nonce，本期暂不启用
export default defineEventHandler(event => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    // 允许同源（devtools/HMR iframe），禁止第三方嵌套
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin'
  })

  if (process.env.NODE_ENV === 'production') {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
