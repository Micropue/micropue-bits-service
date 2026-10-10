import type { H3Event } from 'h3'

// 获取客户端 IP：优先取后端连接地址（socket.remoteAddress）。
// 生产直连 / CDN L4 透传时 socket 即真实客户端 IP，且不可伪造，故生产绝不读取请求头。
// 开发环境 Nitro dev 代理下 socket 不可用，回退到 dev 代理注入的 x-forwarded-for（仅非生产）。
// ponytail: 若生产 CDN 为 L7 反向代理，socket 会是 CDN 边缘 IP（所有用户同桶）；届时需改用 CDN 可信头。
export function getClientIp(event: H3Event): string {
  const ip = getRequestIP(event)
  if (ip) return ip
  if (process.env.NODE_ENV !== 'production') {
    const xff = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    if (xff) return xff
  }
  return 'unknown'
}
