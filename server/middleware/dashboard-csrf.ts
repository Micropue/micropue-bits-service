// 控制台写接口的同源校验（CSRF 兜底）
// Cookie 本身是 HttpOnly + sameSite=lax，跨站表单提交带不上 Cookie；这里再加一道
// Origin / Sec-Fetch-Site 检查：只要不是同源发起的写请求一律 403（非浏览器客户端无这两个头，放行）
export default defineEventHandler(event => {
  const method = (event.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return
  if (!event.path.startsWith('/api/dashboard')) return

  const site = getRequestHeader(event, 'sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request rejected' })
  }

  const origin = getRequestHeader(event, 'origin')
  if (origin) {
    const host = getRequestHeader(event, 'host')
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = ''
    }
    if (!host || originHost !== host) {
      throw createError({ statusCode: 403, statusMessage: 'Cross-site request rejected' })
    }
  }
})
