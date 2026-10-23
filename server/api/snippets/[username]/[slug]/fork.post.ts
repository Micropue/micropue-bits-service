import type { RowDataPacket } from 'mysql2/promise'

// Fork 公开代码段：复制为当前用户的私有代码段，记录来源，原代码段 fork_count +1
// 需要用户名（复制品默认私有，但仍要能在自己的主页里找到并编辑）
export default defineEventHandler(async event => {
  const viewer = await requireAuth(event)
  await enforceUserRateLimit(event, viewer.uuid, 'snippets:fork', 10, 3600)
  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()

  const owner = await findPublicUser(username)
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  if (owner.uuid === viewer.uuid) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot fork your own snippet' })
  }
  if (!viewer.username || viewer.username === viewer.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Set a username before forking — the copy needs a profile URL',
      data: { field: 'username' }
    })
  }

  const source = await fetchSnippetBySlug(owner.uuid, slug)
  if (!source || source.visibility !== 'public') {
    throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  }

  const db = useDb()
  const { slug: newSlug } = await nextContentSlug(viewer.uuid, source.name)
  const languageSidValue = source.language_slug ? await languageSid(source.language_slug) : null
  const sid = shortId()

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `INSERT INTO \`contents\`
         (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`, \`fork_from_sid\`, \`language_sid\`, \`code\`)
       VALUES (?, ?, 'snippet', ?, ?, ?, 'private', ?, ?, ?)`,
      [sid, viewer.uuid, newSlug, source.name, source.intro, source.sid, languageSidValue, source.code]
    )

    const [tagRows] = await conn.query<RowDataPacket[]>(
      'SELECT `tag_sid` FROM `content_tags` WHERE `content_sid` = ?',
      [source.sid]
    )
    for (const tag of tagRows) {
      await conn.execute(
        'INSERT INTO `content_tags` (`sid`, `content_sid`, `tag_sid`) VALUES (?, ?, ?)',
        [shortId(), sid, tag.tag_sid]
      )
    }

    const [dependencyRows] = await conn.query<RowDataPacket[]>(
      'SELECT `dependency_sid` FROM `snippet_dependencies` WHERE `snippet_sid` = ?',
      [source.sid]
    )
    for (const dependency of dependencyRows) {
      await conn.execute(
        'INSERT INTO `snippet_dependencies` (`sid`, `snippet_sid`, `dependency_sid`) VALUES (?, ?, ?)',
        [shortId(), sid, dependency.dependency_sid]
      )
    }

    await conn.execute('UPDATE `contents` SET `fork_count` = `fork_count` + 1 WHERE `sid` = ?', [source.sid])
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

  return { snippet: { slug: newSlug, name: source.name } }
})

// 语言 slug 转 sid（fork 时原样复制语言）
async function languageSid(slug: string): Promise<string | null> {
  const [rows] = await useDb().query<RowDataPacket[]>(
    'SELECT `sid` FROM `languages` WHERE `slug` = ? LIMIT 1',
    [slug]
  )
  return (rows[0]?.sid as string) ?? null
}
