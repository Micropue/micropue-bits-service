// 公开读接口 / 管理端写接口的粗粒度限流。
// 用户级写操作在各自 endpoint 内用 enforceUserRateLimit 做更精确的分桶。
const PUBLIC_READ_RULES: Array<{ bucket: string; pattern: RegExp; limit: number; window: number }> = [
  { bucket: 'sitemap', pattern: /^\/sitemap\.xml$/, limit: 10, window: 60 },
  { bucket: 'oauth-github', pattern: /^\/api\/auth\/github\/(authorize|callback)$/, limit: 30, window: 600 },
  { bucket: 'users-search', pattern: /^\/api\/users\/search$/, limit: 60, window: 60 },
  { bucket: 'snippet-search', pattern: /^\/api\/snippets\/search$/, limit: 60, window: 60 },
  { bucket: 'group-search', pattern: /^\/api\/groups\/search$/, limit: 60, window: 60 },
  { bucket: 'catalog-search', pattern: /^\/api\/search$/, limit: 60, window: 60 },
  { bucket: 'catalog-lookup', pattern: /^\/api\/catalog\/lookup$/, limit: 60, window: 60 },
  { bucket: 'snippets-by-catalog', pattern: /^\/api\/snippets\/by-catalog$/, limit: 30, window: 60 },
  { bucket: 'groups-by-catalog', pattern: /^\/api\/groups\/by-catalog$/, limit: 30, window: 60 },
  { bucket: 'language-search', pattern: /^\/api\/languages\/search$/, limit: 60, window: 60 },
  { bucket: 'dependency-search', pattern: /^\/api\/dependencies\/search$/, limit: 60, window: 60 },
  { bucket: 'languages-index', pattern: /^\/api\/languages$/, limit: 60, window: 60 },
  { bucket: 'languages-detail', pattern: /^\/api\/languages\/[^/]+$/, limit: 60, window: 60 },
  { bucket: 'dependencies-index', pattern: /^\/api\/dependencies$/, limit: 60, window: 60 },
  { bucket: 'dependencies-detail', pattern: /^\/api\/dependencies\/[^/]+$/, limit: 60, window: 60 },
  { bucket: 'profile-snippets', pattern: /^\/api\/profile\/(snippets|groups)$/, limit: 60, window: 60 },
  { bucket: 'public-follows', pattern: /^\/api\/follows$/, limit: 60, window: 60 },
  { bucket: 'public-feedback', pattern: /^\/api\/users\/[^/]+\/[^/]+\/feedback$/, limit: 60, window: 60 },
  { bucket: 'public-content', pattern: /^\/api\/users\/[^/]+\/[^/]+$/, limit: 120, window: 60 },
  { bucket: 'public-profile', pattern: /^\/api\/users\/[^/]+$/, limit: 120, window: 60 },
  { bucket: 'public-tags', pattern: /^\/api\/tags$/, limit: 60, window: 60 },
  { bucket: 'public-changelogs', pattern: /^\/api\/changelogs$/, limit: 60, window: 60 },
  { bucket: 'github-star', pattern: /^\/api\/github\/star$/, limit: 60, window: 60 }
]

export default defineEventHandler(async event => {
  const method = (event.method || 'GET').toUpperCase()
  if (method === 'OPTIONS') return

  const path = (event.path || '').split('?')[0] || ''

  // 管理端所有写接口加一层粗粒度保护；高风险动作在 endpoint 内还有更严格的限额
  if (path.startsWith('/api/dashboard/') && method !== 'GET' && method !== 'HEAD') {
    await enforceIpRateLimit(event, 'admin-write', 100, 3600)
    return
  }

  if (method !== 'GET' && method !== 'HEAD') return
  const rule = PUBLIC_READ_RULES.find(item => item.pattern.test(path))
  if (!rule) return

  // Nuxt SSR 内部的 useFetch 不是公网访问，不能参与 IP 限流
  if (isInternalClientIp(getClientIp(event))) return

  await enforceIpRateLimit(event, rule.bucket, rule.limit, rule.window)
})
