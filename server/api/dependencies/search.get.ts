import type { RowDataPacket } from 'mysql2/promise'

// 依赖搜索（公开）：按语言过滤；空关键词随机抽样，有关键词按名称检索
// 供 /new 的依赖选择器做「初始抽样 + 防抖远程搜索」
const SAMPLE_LIMIT = 15
const SEARCH_LIMIT = 20
const MAX_TERM = 60

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, char => `\\${char}`)}%`
}

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const languageSlug = String(query.language ?? '').trim().toLowerCase()
  if (!languageSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Language is required' })
  }
  const term = String(query.q ?? '').trim().slice(0, MAX_TERM)
  const db = useDb()

  const [languageRows] = await db.query<RowDataPacket[]>(
    'SELECT `sid` FROM `languages` WHERE `slug` = ? LIMIT 1',
    [languageSlug]
  )
  const language = languageRows[0]
  if (!language) throw createError({ statusCode: 404, statusMessage: 'Language not found' })

  const baseSql = `SELECT d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`logo_url\`
     FROM \`dependencies\` d
     JOIN \`dependency_languages\` dl ON dl.\`dependency_sid\` = d.\`sid\`
    WHERE dl.\`language_sid\` = ?`

  if (!term) {
    const [rows] = await db.query<RowDataPacket[]>(
      `${baseSql} ORDER BY RAND() LIMIT ?`,
      [language.sid, SAMPLE_LIMIT]
    )
    return { dependencies: rows, sampled: true }
  }

  const [rows] = await db.query<RowDataPacket[]>(
    `${baseSql} AND d.\`name\` LIKE ? ORDER BY d.\`name\` ASC LIMIT ?`,
    [language.sid, likePattern(term), SEARCH_LIMIT]
  )
  return { dependencies: rows, sampled: false }
})
