// 创建代码段（站点用户）：创建向导提交的唯一写接口
// 校验与分组/标签/依赖写入的统一实现见 server/utils/contentInput.ts
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'contents:create', 30, 3600)
  const body = await readBody<Record<string, unknown>>(event)

  const fields = await readSnippetFields(body, user)
  const { slug, adjusted: deduplicated } = await nextContentSlug(user.uuid, fields.name)

  const sid = shortId()
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `INSERT INTO \`contents\`
         (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`, \`group_sid\`, \`language_sid\`, \`code\`)
       VALUES (?, ?, 'snippet', ?, ?, ?, ?, ?, ?, ?)`,
      [sid, user.uuid, slug, fields.name, fields.intro, fields.visibility, fields.groupSid, fields.languageSid, fields.code]
    )

    await replaceContentTags(conn, sid, fields.tags)
    await replaceSnippetDependencies(conn, sid, fields.dependencySids)

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

  return { snippet: { sid, slug, name: fields.name, visibility: fields.visibility, deduplicated } }
})
