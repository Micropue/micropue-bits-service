import type { RowDataPacket } from 'mysql2/promise'

// 编程语言详情（公开）：/language/{slug} 页面数据源；不存在返回 404
// entries 为该语言名下的依赖目录条目（框架/库/工具/运行时），用于页面互相关联
// 每种类型随机保留 27 条（GROUP_LIMIT），并带回该类型总数（用于 "+N more"）
const GROUP_LIMIT = 27

export default defineEventHandler(async event => {
  // 随机抽样，响应不可复用缓存
  setHeader(event, 'cache-control', 'no-store')

  const slug = getRouterParam(event, 'slug')
  if (!slug || !isValidSlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Language not found' })
  }

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `slug`, `name`, `intro`, `logo_url`, `link_url` FROM `languages` WHERE `slug` = ? LIMIT 1',
    [slug]
  )
  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Language not found' })
  }

  const [entries] = await useDb().query<RowDataPacket[]>(
    `SELECT d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`logo_url\`
     FROM \`dependencies\` d
     JOIN \`dependency_languages\` dl ON dl.\`dependency_sid\` = d.\`sid\`
     JOIN \`languages\` l ON l.\`sid\` = dl.\`language_sid\`
     WHERE l.\`slug\` = ?`,
    [slug]
  )

  // 每种类型随机保留 27 条（每次请求重新抽），落选项仍可直链/检索到达
  const byKind = new Map<string, RowDataPacket[]>()
  for (const row of entries) {
    const bucket = byKind.get(row.kind as string)
    if (bucket) bucket.push(row)
    else byKind.set(row.kind as string, [row])
  }

  const sampled = [...byKind.values()].flatMap(bucket =>
    sampleRandom(bucket, GROUP_LIMIT).map(row => ({
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      logo_url: row.logo_url,
      total: bucket.length
    }))
  )

  return { language: rows[0], entries: sampled }
})
