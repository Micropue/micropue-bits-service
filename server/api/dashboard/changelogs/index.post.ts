// 控制台新建更新日志（可保存草稿或直接发布）
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const body = await readBody<{ title?: string, body?: string, published?: boolean }>(event)
  const title = String(body?.title ?? '').trim()
  const content = String(body?.body ?? '').trim()
  if (title.length < 1 || title.length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'Title must be 1-120 characters', data: { field: 'title' } })
  }
  if (content.length < 1 || content.length > 20000) {
    throw createError({ statusCode: 400, statusMessage: 'Body must be 1-20000 characters', data: { field: 'body' } })
  }

  const published = body?.published === true
  const sid = shortId()
  await useDb().execute(
    `INSERT INTO \`changelogs\` (\`sid\`, \`title\`, \`body\`, \`published_at\`, \`created_by\`)
     VALUES (?, ?, ?, ?, ?)`,
    [sid, title, content, published ? new Date() : null, admin.uuid]
  )
  return { entry: { sid, title, published } }
})
