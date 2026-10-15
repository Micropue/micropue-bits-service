import type { RowDataPacket } from 'mysql2/promise'

// 依赖索引（公开）：/dependencies 页面数据源
// 每个「语言 × 类型」随机保留 27 条（每次请求重新抽），落选项仍可直链/检索到达
// 条目可适用多种语言，因此在多个语言下各出现一次
const GROUP_LIMIT = 27

interface EntryRow extends RowDataPacket {
  slug: string
  name: string
  kind: string
  logo_url: string | null
  language_slug: string
  language_name: string
  language_logo_url: string | null
}

export default defineEventHandler(async event => {
  // 随机抽样，响应不可复用缓存
  setHeader(event, 'cache-control', 'no-store')

  const [rows] = await useDb().query<EntryRow[]>(
    `SELECT d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`logo_url\`,
            l.\`slug\` AS \`language_slug\`, l.\`name\` AS \`language_name\`, l.\`logo_url\` AS \`language_logo_url\`
     FROM \`dependencies\` d
     JOIN \`dependency_languages\` dl ON dl.\`dependency_sid\` = d.\`sid\`
     JOIN \`languages\` l ON l.\`sid\` = dl.\`language_sid\``
  )

  const groups = new Map<string, EntryRow[]>()
  for (const row of rows) {
    const key = `${row.language_slug}:${row.kind}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(row)
    else groups.set(key, [row])
  }

  const entries = [...groups.values()].flatMap(bucket =>
    sampleRandom(bucket, GROUP_LIMIT).map(row => ({
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      logo_url: row.logo_url,
      total: bucket.length,
      language: { slug: row.language_slug, name: row.language_name, logo_url: row.language_logo_url }
    }))
  )

  return { entries }
})
