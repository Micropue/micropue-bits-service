import type { RowDataPacket } from 'mysql2/promise'

// 指令框的目录检索（公开）：按类型 + 名称/别名模糊匹配，返回可直接跳转的条目
// kind = language / framework / library / tool / runtime（单类型）或 all（跨全部依赖类型）
const LIMIT = 8
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

  const db = useDb()
  if (kind === 'language') {
    const [rows] = await db.query<EntryRow[]>(
      'SELECT `slug`, `name`, `logo_url` FROM `languages` WHERE (`name` LIKE ? OR `slug` LIKE ?) ORDER BY `name` ASC LIMIT ?',
      [pattern, pattern, LIMIT]
    )
    return {
      items: rows.map(row => ({
        slug: row.slug,
        name: row.name,
        logo_url: row.logo_url,
        kind,
        to: `/language/${row.slug}`
      }))
    }
  }

  // all：跨全部依赖类型（用户不必先知道某个包是 framework 还是 library）
  const [rows] = kind === 'all'
    ? await db.query<EntryRow[]>(
        'SELECT `slug`, `name`, `logo_url`, `kind` FROM `dependencies` WHERE (`name` LIKE ? OR `slug` LIKE ?) ORDER BY `name` ASC LIMIT ?',
        [pattern, pattern, LIMIT]
      )
    : await db.query<EntryRow[]>(
        'SELECT `slug`, `name`, `logo_url`, `kind` FROM `dependencies` WHERE `kind` = ? AND (`name` LIKE ? OR `slug` LIKE ?) ORDER BY `name` ASC LIMIT ?',
        [kind, pattern, pattern, LIMIT]
      )
  return {
    items: rows.map(row => ({
      slug: row.slug,
      name: row.name,
      logo_url: row.logo_url,
      kind: row.kind,
      to: `/${row.kind}/${row.slug}`
    }))
  }
})
