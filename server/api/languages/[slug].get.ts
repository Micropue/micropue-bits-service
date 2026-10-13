import type { RowDataPacket } from 'mysql2/promise'

// 编程语言详情（公开）：/language/{slug} 页面的数据源；不存在返回 404
export default defineEventHandler(async event => {
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

  return { language: rows[0] }
})
