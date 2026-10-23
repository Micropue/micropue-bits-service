import type { RowDataPacket } from 'mysql2/promise'

// 目录检索（公开）：按名称/标识模糊查语言与依赖条目
// 供索引页的「输入即检索」使用：调用方需自行防抖，这里只保证查询便宜且有上限
// scope=languages 只搜语言、scope=dependencies 只搜依赖（缺省两者都搜）
// 允许单字符检索；通配符直接剔除，避免用户输入被当成模式匹配
const MIN_TERM = 1
const MAX_TERM = 60
const DEFAULT_LANGUAGE_LIMIT = 8
const DEFAULT_DEPENDENCY_LIMIT = 18
const MAX_LIMIT = 50

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const raw = query.q
  const term = (typeof raw === 'string' ? raw : '').trim().replace(/[%_]/g, '').slice(0, MAX_TERM)
  if (term.length < MIN_TERM) return { results: [], total: 0, hasMore: false }

  const scope = query.scope === 'languages' || query.scope === 'dependencies' ? query.scope : 'all'
  const contains = `%${term}%`
  const prefix = `${term}%`
  const db = useDb()
  const results: RowDataPacket[] = []
  const limit = Math.min(
    Math.max(Number(query.limit) || (scope === 'dependencies' ? DEFAULT_DEPENDENCY_LIMIT : DEFAULT_LANGUAGE_LIMIT), 1),
    MAX_LIMIT
  )
  const offset = Math.max(Number(query.offset) || 0, 0)
  let total = 0

  if (scope !== 'dependencies') {
    const [[countRow]] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS `total` FROM `languages` WHERE `name` LIKE ? OR `slug` LIKE ?',
      [contains, contains]
    )
    const languageTotal = Number(countRow?.total ?? 0)
    total += languageTotal
    const [languages] = await db.query<RowDataPacket[]>(
      `SELECT 'language' AS \`kind\`, \`slug\`, \`name\`, \`logo_url\`
       FROM \`languages\`
       WHERE \`name\` LIKE ? OR \`slug\` LIKE ?
       ORDER BY (\`name\` LIKE ?) DESC, \`sort_order\` ASC, \`name\` ASC, \`slug\` ASC
       LIMIT ? OFFSET ?`,
      [contains, contains, prefix, scope === 'all' ? DEFAULT_LANGUAGE_LIMIT : limit, scope === 'all' ? 0 : offset]
    )
    results.push(...languages)
  }

  if (scope !== 'languages') {
    const [[countRow]] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS `total` FROM `dependencies` WHERE `name` LIKE ? OR `slug` LIKE ?',
      [contains, contains]
    )
    const dependencyTotal = Number(countRow?.total ?? 0)
    total += dependencyTotal
    const [dependencies] = await db.query<RowDataPacket[]>(
      `SELECT \`kind\`, \`slug\`, \`name\`, \`logo_url\`
       FROM \`dependencies\`
       WHERE \`name\` LIKE ? OR \`slug\` LIKE ?
       ORDER BY (\`name\` LIKE ?) DESC, \`sort_order\` ASC, \`name\` ASC, \`slug\` ASC
       LIMIT ? OFFSET ?`,
      [contains, contains, prefix, scope === 'all' ? DEFAULT_DEPENDENCY_LIMIT : limit, scope === 'all' ? 0 : offset]
    )
    results.push(...dependencies)
  }

  setHeader(event, 'cache-control', 'public, max-age=60')
  return {
    results,
    total,
    hasMore: results.length < total
  }
})
