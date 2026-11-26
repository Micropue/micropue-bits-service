import type { RowDataPacket } from 'mysql2/promise'

// 编辑代码段（本人）：字段与创建同一套校验；slug 可修改，旧地址写入别名表供重定向
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'contents:update', 120, 3600)
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const body = await readBody<Record<string, unknown>>(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid`, `slug` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `kind` = 'snippet' AND `deleted_at` IS NULL LIMIT 1",
    [user.uuid, slug]
  )
  const current = rows[0]
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  const fields = await readSnippetFields(body, user)
  const requestedSlug = normalizeContentSlug(body?.slug)
  const nextSlug = requestedSlug ?? String(current.slug)
  const slugChanged = nextSlug !== current.slug
  if (slugChanged && !(await contentSlugAvailable(user.uuid, nextSlug, String(current.sid)))) {
    throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
  }

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()

    if (slugChanged) {
      await conn.execute(
        'DELETE FROM `content_aliases` WHERE `owner_uuid` = ? AND `slug` = ? AND `content_sid` = ?',
        [user.uuid, nextSlug, current.sid]
      )
      await conn.execute(
        `INSERT IGNORE INTO \`content_aliases\` (\`sid\`, \`owner_uuid\`, \`slug\`, \`content_sid\`)
         VALUES (?, ?, ?, ?)`,
        [shortId(), user.uuid, current.slug, current.sid]
      )
    }

    await conn.execute(
      `UPDATE \`contents\`
          SET \`slug\` = ?, \`name\` = ?, \`intro\` = ?, \`visibility\` = ?, \`group_sid\` = ?,
              \`language_sid\` = ?, \`code\` = ?
        WHERE \`sid\` = ?`,
      [nextSlug, fields.name, fields.intro, fields.visibility, fields.groupSid, fields.languageSid, fields.code, current.sid]
    )

    await replaceContentTags(conn, current.sid, fields.tags)
    await replaceSnippetDependencies(conn, current.sid, fields.dependencySids)

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken', data: { field: 'slug' } })
    }
    throw err
  } finally {
    conn.release()
  }

  return { snippet: { slug: nextSlug, previousSlug: slug, slugChanged, name: fields.name, visibility: fields.visibility } }
})
