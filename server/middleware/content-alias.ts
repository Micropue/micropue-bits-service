import type { RowDataPacket } from 'mysql2/promise'

const RESERVED_ROOTS = new Set([
  'account', 'admin', 'api', 'changelog', 'dashboard', 'developer', 'docs', 'favorites',
  'feedback', 'framework', 'language', 'library', 'login', 'new', 'report', 'request',
  'runtime', 'search', 'sign', 'tool', 'user'
])

// 内容改名后的公开旧地址重定向。只在形如 /{username}/{slug} 的 GET/HEAD 请求上查询别名。
export default defineEventHandler(async event => {
  if (!['GET', 'HEAD'].includes(getMethod(event))) return
  const url = getRequestURL(event)
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length < 2 || segments.length > 3) return
  if (RESERVED_ROOTS.has(segments[0]!.toLowerCase())) return

  const action = segments[2]?.toLowerCase() ?? ''
  if (action && action !== 'raw' && action !== 'edit') return

  let username: string
  let slug: string
  try {
    username = decodeURIComponent(segments[0]!)
    slug = decodeURIComponent(segments[1]!)
  } catch {
    return
  }

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`slug\` AS \`target_slug\`, c.\`kind\`, c.\`visibility\`, u.\`uuid\`, u.\`username\`
       FROM \`content_aliases\` a
       JOIN \`contents\` c ON c.\`sid\` = a.\`content_sid\` AND c.\`deleted_at\` IS NULL
       JOIN \`users\` u ON u.\`uuid\` = a.\`owner_uuid\`
      WHERE u.\`username\` = ? AND a.\`slug\` = ?
      LIMIT 1`,
    [username, slug]
  )
  const alias = rows[0]
  if (!alias) return
  if (action && alias.kind !== 'snippet') return

  if (alias.visibility === 'private') {
    const viewer = await getAuthUser(event)
    if (!viewer || viewer.uuid !== alias.uuid) return
    setResponseHeader(event, 'cache-control', 'no-store')
  }

  const target = `/${encodeURIComponent(String(alias.username))}/${encodeURIComponent(String(alias.target_slug))}` +
    (action ? `/${action}` : '') + url.search
  return sendRedirect(event, target, alias.visibility === 'private' ? 302 : 301)
})
