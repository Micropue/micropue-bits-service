import type { RowDataPacket } from 'mysql2/promise'

// 编程语言索引（公开）：/languages 页面数据源
// 按名称首字母分组，每组随机保留 18 条（每次请求重新抽），落选项仍可直链/检索到达
const LETTER_LIMIT = 18

interface LanguageRow extends RowDataPacket {
  slug: string
  name: string
  logo_url: string | null
  initial: string
}

export default defineEventHandler(async event => {
  // 随机抽样，响应不可复用缓存
  setHeader(event, 'cache-control', 'no-store')

  const [rows] = await useDb().query<LanguageRow[]>(
    `SELECT \`slug\`, \`name\`, \`logo_url\`, UPPER(LEFT(\`name\`, 1)) AS \`initial\` FROM \`languages\``
  )

  const groups = new Map<string, LanguageRow[]>()
  for (const row of rows) {
    const bucket = groups.get(row.initial)
    if (bucket) bucket.push(row)
    else groups.set(row.initial, [row])
  }

  const languages = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, bucket]) =>
      sampleRandom(bucket, LETTER_LIMIT).map(row => ({
        slug: row.slug,
        name: row.name,
        logo_url: row.logo_url,
        initial: row.initial,
        total: bucket.length
      }))
    )

  return { languages }
})
