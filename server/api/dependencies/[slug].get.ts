import type { RowDataPacket } from 'mysql2/promise'

// 依赖目录条目详情（公开）：/{kind}/{slug} 页面的数据源；不存在返回 404
// 类型是否与路径相符由页面判断（同一接口服务框架/库/工具/运行时）
// languages 为该条目适用的全部语言（主语言优先），用于回链语言介绍页
export default defineEventHandler(async event => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || !isValidSlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid`, `slug`, `name`, `kind`, `intro`, `logo_url`, `link_url` FROM `dependencies` WHERE `slug` = ? LIMIT 1',
    [slug]
  )
  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  const { sid, ...dependency } = rows[0]
  const [languages] = await useDb().query<RowDataPacket[]>(
    `SELECT l.\`slug\`, l.\`name\`, l.\`logo_url\`
     FROM \`dependency_languages\` dl JOIN \`languages\` l ON l.\`sid\` = dl.\`language_sid\`
     WHERE dl.\`dependency_sid\` = ?
     ORDER BY dl.\`is_primary\` DESC, dl.\`sort_order\``,
    [sid]
  )

  return { dependency, languages }
})
