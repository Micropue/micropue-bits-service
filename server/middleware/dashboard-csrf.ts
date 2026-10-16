import type { H3Event } from 'h3'

// 控制台写接口的同源校验（CSRF 兜底）
// Cookie 本身是 HttpOnly + sameSite=lax，跨站表单提交带不上 Cookie；这里再加一道浏览器来源检查：
// 1) Sec-Fetch-Site 存在时必须是 same-origin / none（浏览器设置，脚本无法伪造）
// 2) Origin 存在时，其主机名必须属于本站可信用主机集合
//    —— 生产常挂在反向代理/CDN 后面：请求的 Host 可能是上游地址，反向代理的域名在 x-forwarded-host，
//       也可能两边都不是，所以再把站点公开域名（runtimeConfig.public.siteUrl）一并纳入白名单
// shortcut: 比的是主机名（不含端口/协议），代理若改写端口也不会误拦；若将来出现多域名部署，把域名加进 siteUrl 或扩展白名单

// 本站可信主机名集合（不带协议与端口）
function trustedHostnames(event: H3Event): string[] {
  const hosts = new Set<string>()
  const push = (value?: string | null) => {
    const raw = String(value ?? '').split(',')[0]?.trim().toLowerCase()
    if (!raw) return
    try {
      hosts.add(new URL(raw.includes('://') ? raw : `http://${raw}`).hostname)
    } catch {
      // 解析失败就忽略
    }
  }
  push(getRequestHeader(event, 'host'))
  push(getRequestHeader(event, 'x-forwarded-host'))
  push(String(useRuntimeConfig(event).public.siteUrl ?? ''))
  return [...hosts]
}

export default defineEventHandler(event => {
  const method = (event.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return
  if (!event.path.startsWith('/api/dashboard')) return

  const site = getRequestHeader(event, 'sec-fetch-site')?.toLowerCase()
  if (site && site !== 'same-origin' && site !== 'none') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request rejected' })
  }

  const origin = getRequestHeader(event, 'origin')
  if (origin) {
    let hostname = ''
    try {
      hostname = new URL(origin).hostname.toLowerCase()
    } catch {
      hostname = ''
    }
    if (!hostname || !trustedHostnames(event).includes(hostname)) {
      throw createError({ statusCode: 403, statusMessage: 'Cross-site request rejected' })
    }
  }
})
