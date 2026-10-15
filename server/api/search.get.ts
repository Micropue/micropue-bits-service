import type { RowDataPacket } from 'mysql2/promise'

// 目录检索（公开）：按名称/标识模糊查语言与依赖条目
// 供索引页的「输入即检索」使用：调用方需自行防抖，这里只保证查询便宜且有上限
// scope=languages 只搜语言、scope=dependencies 只搜依赖（缺省两者都搜）
// 单字符不检索；通配符直接剔除，避免用户输入被当成模式匹配
const MIN_TERM = 2
const MAX_TERM = 60
const LANGUAGE_LIMIT = 8
const DEPENDENCY_LIMIT = 18

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const raw = query.q
  const term = (typeof raw === 'string' ? raw : '').trim().replace(/[%_]/g, '').slice(0, MAX_TERM)
  if (term.length < MIN_TERM) return { results: [] }

  const scope = query.scope === 'languages' || query.scope === 'dependencies' ? query.scope : 'all'
  const contains = `%${term}%`
  const prefix = `${term}%`
  const results: RowDataPacket[] = []

  if (scope !== 'dependencies') {
    const [languages] = await useDb().query<RowDataPacket[]>(
      `SELECT 'language' AS \`kind\`, \`slug\`, \`name\`, \`logo_url\`
       FROM \`languages\`
       WHERE \`name\` LIKE ? OR \`slug\` LIKE ?
       ORDER BY (\`name\` LIKE ?) DESC, \`sort_order\`
       LIMIT ${LANGUAGE_LIMIT}`,
      [contains, contains, prefix]
    )
    results.push(...languages)
  }

  if (scope !== 'languages') {
    const [dependencies] = await useDb().query<RowDataPacket[]>(
      `SELECT \`kind\`, \`slug\`, \`name\`, \`logo_url\`
       FROM \`dependencies\`
       WHERE \`name\` LIKE ? OR \`slug\` LIKE ?
       ORDER BY (\`name\` LIKE ?) DESC, \`sort_order\`
       LIMIT ${DEPENDENCY_LIMIT}`,
      [contains, contains, prefix]
    )
    results.push(...dependencies)
  }

  setHeader(event, 'cache-control', 'public, max-age=60')
  return { results }
})
