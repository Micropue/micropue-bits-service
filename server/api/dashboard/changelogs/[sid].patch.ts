import type { RowDataPacket } from 'mysql2/promise'

// 控制台编辑 / 发布 / 撤回更新日志
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ title?: string, body?: string, published?: boolean }>(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid`, `published_at` FROM `changelogs` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  const current = rows[0]
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Changelog not found' })

  const title = String(body?.title ?? '').trim()
  const content = String(body?.body ?? '').trim()
  if (title.length < 1 || title.length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'Title must be 1-120 characters', data: { field: 'title' } })
  }
  if (content.length < 1 || content.length > 20000) {
    throw createError({ statusCode: 400, statusMessage: 'Body must be 1-20000 characters', data: { field: 'body' } })
  }

  const published = body?.published === true
  const publishedAt = published ? (current.published_at ?? new Date()) : null
  await useDb().execute(
    'UPDATE `changelogs` SET `title` = ?, `body` = ?, `published_at` = ? WHERE `sid` = ?',
    [title, content, publishedAt, sid]
  )
  return { entry: { sid, title, published } }
})
