import type { RowDataPacket } from 'mysql2/promise'

// 指令框的目录检索（公开）：按类型 + 名称/别名模糊匹配，返回可直接跳转的条目
// kind = language / framework / library / tool / runtime（单类型）或 all（跨全部依赖类型）
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 50
const CATALOG_KINDS = ['language', 'framework', 'library', 'tool', 'runtime', 'all'] as const

type CatalogKind = (typeof CATALOG_KINDS)[number]

interface EntryRow extends RowDataPacket {
  slug: string
  name: string
  logo_url: string | null
  kind?: string
}

// LIKE 通配符转义（反斜杠是 MySQL 默认转义符）
function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, char => `\\${char}`)}%`
}

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const kind = String(query.kind ?? '') as CatalogKind
  if (!CATALOG_KINDS.includes(kind)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown catalog kind' })
  }
  const q = String(query.q ?? '').trim().slice(0, 64)
  const pattern = likePattern(q)
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const db = useDb()

  if (kind === 'language') {
    const [[countRow]] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS `total` FROM `languages` WHERE (`name` LIKE ? OR `slug` LIKE ?)',
      [pattern, pattern]
    )
    const [rows] = await db.query<EntryRow[]>(
      'SELECT `slug`, `name`, `logo_url` FROM `languages` WHERE (`name` LIKE ? OR `slug` LIKE ?) ORDER BY `name` ASC, `slug` ASC LIMIT ? OFFSET ?',
      [pattern, pattern, limit, offset]
    )
    const total = Number(countRow?.total ?? 0)
    return {
      items: rows.map(row => ({
        slug: row.slug,
        name: row.name,
        logo_url: row.logo_url,
        kind,
        to: `/language/${row.slug}`
      })),
      total,
      hasMore: offset + rows.length < total
    }
  }

  // all：跨全部依赖类型（用户不必先知道某个包是 framework 还是 library）
  const where = kind === 'all'
    ? '(`name` LIKE ? OR `slug` LIKE ?)'
    : '`kind` = ? AND (`name` LIKE ? OR `slug` LIKE ?)'
  const params = kind === 'all' ? [pattern, pattern] : [kind, pattern, pattern]
  const [[countRow]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`dependencies\` WHERE ${where}`,
    params
  )
  const [rows] = await db.query<EntryRow[]>(
    `SELECT \`slug\`, \`name\`, \`logo_url\`, \`kind\` FROM \`dependencies\` WHERE ${where}
      ORDER BY \`name\` ASC, \`slug\` ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  const total = Number(countRow?.total ?? 0)
  return {
    items: rows.map(row => ({
      slug: row.slug,
      name: row.name,
      logo_url: row.logo_url,
      kind: row.kind,
      to: `/${row.kind}/${row.slug}`
    })),
    total,
    hasMore: offset + rows.length < total
  }
})
