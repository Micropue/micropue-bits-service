import type { RowDataPacket } from 'mysql2/promise'

// 编辑代码段（本人）：字段与创建同一套校验；slug 不可修改
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'contents:update', 120, 3600)
  const slug = String(getRouterParam(event, 'slug') ?? '')
  const body = await readBody<Record<string, unknown>>(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `sid` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? AND `kind` = 'snippet' AND `deleted_at` IS NULL LIMIT 1",
    [user.uuid, slug]
  )
  const current = rows[0]
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })

  const fields = await readSnippetFields(body, user)

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `UPDATE \`contents\`
          SET \`name\` = ?, \`intro\` = ?, \`visibility\` = ?, \`group_sid\` = ?, \`language_sid\` = ?, \`code\` = ?
        WHERE \`sid\` = ?`,
      [fields.name, fields.intro, fields.visibility, fields.groupSid, fields.languageSid, fields.code, current.sid]
    )

    await replaceContentTags(conn, current.sid, fields.tags)
    await replaceSnippetDependencies(conn, current.sid, fields.dependencySids)

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { snippet: { slug, name: fields.name, visibility: fields.visibility } }
})
