import type { RowDataPacket } from 'mysql2/promise'

// 我的目录条目申请：登录用户查看自己提交的新语言 / 新依赖及其审核状态
// 支持 limit / offset 分页（前端「加载更多」每次取 10 条）
const MAX_LIMIT = 50
const DEFAULT_LIMIT = 10

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const db = useDb()
  const [countRows] = await db.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS `count` FROM `catalog_requests` WHERE `user_uuid` = ?',
    [user.uuid]
  )
  const total = Number(countRows[0]?.count ?? 0)

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT r.\`sid\`, r.\`kind\`, r.\`status\`, r.\`name\`, r.\`link_url\`, r.\`dependency_kind\`,
            r.\`language_sids\`, r.\`reject_reason\`, r.\`created_at\`, r.\`reviewed_at\`,
            l.\`slug\` AS \`language_slug\`, d.\`slug\` AS \`dependency_slug\`, d.\`kind\` AS \`dependency_published_kind\`
       FROM \`catalog_requests\` r
       LEFT JOIN \`languages\` l ON r.\`kind\` = 'language' AND l.\`sid\` = r.\`published_sid\`
       LEFT JOIN \`dependencies\` d ON r.\`kind\` = 'dependency' AND d.\`sid\` = r.\`published_sid\`
      WHERE r.\`user_uuid\` = ?
      ORDER BY r.\`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [user.uuid, limit, offset]
  )

  // 依赖申请带出所选语言名（首个为主语言）
  const sids = [...new Set(rows.flatMap(row => normalizeSids(row.language_sids)))]
  const names = new Map<string, string>()
  if (sids.length) {
    const [languages] = await db.query<RowDataPacket[]>(
      `SELECT \`sid\`, \`name\` FROM \`languages\` WHERE \`sid\` IN (${sids.map(() => '?').join(', ')})`,
      sids
    )
    for (const language of languages) names.set(language.sid as string, language.name as string)
  }

  return {
    total,
    requests: rows.map(row => {
      const languageSids = normalizeSids(row.language_sids)
      const languages = languageSids.map((sid, index) => ({
        sid,
        name: names.get(sid) ?? '(removed)',
        isPrimary: index === 0
      }))
      // 已通过的条目给出去目录页的路径（语言 → /language/{slug}；依赖 → /{kind}/{slug}）
      const published = row.kind === 'language' && row.language_slug
        ? { to: `/language/${row.language_slug}`, label: 'View in catalog' }
        : (row.dependency_slug
            ? { to: `/${row.dependency_published_kind ?? 'library'}/${row.dependency_slug}`, label: 'View in catalog' }
            : null)
      return {
        sid: row.sid,
        kind: row.kind,
        status: row.status,
        name: row.name,
        link_url: row.link_url,
        dependency_kind: row.dependency_kind,
        languages,
        reject_reason: row.reject_reason,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        published
      }
    })
  }
})

function normalizeSids(value: unknown): string[] {
  const list = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value)
        } catch {
          return []
        }
      })()
    : value
  return Array.isArray(list) ? list.map(item => String(item)) : []
}
