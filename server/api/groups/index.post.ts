// 创建代码段分组（本人）：与代码段共用 /{username}/{slug} 命名空间
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<Record<string, unknown>>(event)

  const fields = readGroupFields(body, user)
  const { slug, adjusted: deduplicated } = await nextContentSlug(user.uuid, fields.name)
  const sid = shortId()

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      `INSERT INTO \`contents\` (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`)
       VALUES (?, ?, 'group', ?, ?, ?, ?)`,
      [sid, user.uuid, slug, fields.name, fields.intro, fields.visibility]
    )
    await replaceContentTags(conn, sid, fields.tags)
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This URL is already taken, please try again' })
    }
    throw err
  } finally {
    conn.release()
  }

  return { group: { slug, name: fields.name, visibility: fields.visibility, deduplicated } }
})
