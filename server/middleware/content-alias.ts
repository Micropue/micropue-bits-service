import type { RowDataPacket } from 'mysql2/promise'

const RESERVED_ROOTS = new Set([
  '_ipx', '_nuxt', 'account', 'admin', 'api', 'assets', 'changelog', 'dashboard',
  'dependencies', 'developer', 'docs', 'explore', 'favorites', 'feedback', 'framework',
  'language', 'languages', 'legal', 'library', 'login', 'logout', 'new', 'oauth',
  'report', 'request', 'requests', 'runtime', 'search', 'settings', 'sign', 'static',
  'tool', 'updates', 'user'
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
  // 用户名规则固定为 2-20 位字母/数字/下划线/短横线；提前拒绝静态资源和非内容路径。
  if (!/^[a-z0-9_-]{2,20}$/i.test(username) || !slug || slug.length > 40) return

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT c.\`slug\` AS \`target_slug\`, c.\`kind\`, c.\`visibility\`, u.\`uuid\`, u.\`username\`
       FROM \`content_aliases\` a
       JOIN \`contents\` c ON c.\`sid\` = a.\`content_sid\`
        AND c.\`owner_uuid\` = a.\`owner_uuid\` AND c.\`deleted_at\` IS NULL
       JOIN \`users\` u ON u.\`uuid\` = a.\`owner_uuid\` AND u.\`status\` = 'normal'
      WHERE u.\`username\` = ? AND a.\`slug\` = ?
        AND NOT EXISTS (
          SELECT 1 FROM \`contents\` current
           WHERE current.\`owner_uuid\` = a.\`owner_uuid\`
             AND current.\`slug\` = a.\`slug\`
             AND current.\`deleted_at\` IS NULL
        )
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
