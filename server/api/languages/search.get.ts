import type { RowDataPacket } from 'mysql2/promise'

// 语言搜索（公开）：空关键词返回随机样本，有关键词按名称检索
// 供 /new 与 /request 的选择器做「初始抽样 + 防抖远程搜索」；只按名称匹配，与前端 Select 的本地过滤保持一致
const SAMPLE_LIMIT = 12
const SEARCH_LIMIT = 20
const MAX_TERM = 60

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, char => `\\${char}`)}%`
}

export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const term = String(getQuery(event).q ?? '').trim().slice(0, MAX_TERM)
  const db = useDb()

  if (!term) {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT `slug`, `name`, `logo_url` FROM `languages` ORDER BY RAND() LIMIT ?',
      [SAMPLE_LIMIT]
    )
    return { languages: rows, sampled: true }
  }

  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT `slug`, `name`, `logo_url` FROM `languages` WHERE `name` LIKE ? ORDER BY `name` ASC LIMIT ?',
    [likePattern(term), SEARCH_LIMIT]
  )
  return { languages: rows, sampled: false }
})
