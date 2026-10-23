import type { RowDataPacket } from 'mysql2/promise'

// Fork 公开分组：复制分组与组内全部公开代码段为当前用户的私有内容
// 新分组默认私有；每条复制品记录 fork_from_sid，原分组 / 原代码段 fork_count +1
export default defineEventHandler(async event => {
  const viewer = await requireAuth(event)
  await enforceUserRateLimit(event, viewer.uuid, 'groups:fork', 3, 3600)
  const ownerName = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()

  const owner = await findPublicUser(ownerName)
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  if (owner.uuid === viewer.uuid) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot fork your own group' })
  }
  if (!viewer.username || viewer.username === viewer.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Set a username before forking — the copy needs a profile URL',
      data: { field: 'username' }
    })
  }

  const source = await fetchGroupBySlug(owner.uuid, slug)
  if (!source || source.visibility !== 'public') {
    throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  }

  const db = useDb()
  const [sourceSnippets] = await db.query<RowDataPacket[]>(
    `SELECT \`sid\`, \`name\`, \`intro\`, \`code\`, \`language_sid\`
       FROM \`contents\`
      WHERE \`group_sid\` = ? AND \`kind\` = 'snippet' AND \`deleted_at\` IS NULL AND \`visibility\` = 'public'
      ORDER BY \`updated_at\` DESC`,
    [source.sid]
  )
  if (!sourceSnippets.length) {
    throw createError({ statusCode: 400, statusMessage: 'This group has no public snippets to fork' })
  }

  // 在同一事务内生成所有 slug：先取已有 slug 集合，避免同名复制品互相冲突
  const [existingRows] = await db.query<RowDataPacket[]>(
    `SELECT \`slug\` FROM \`contents\` WHERE \`owner_uuid\` = ?
     UNION
     SELECT \`slug\` FROM \`content_aliases\` WHERE \`owner_uuid\` = ?`,
    [viewer.uuid, viewer.uuid]
  )
  const takenSlugs = new Set(existingRows.map(row => row.slug as string))
  const nextSlug = (name: string) => {
    const base = slugifyContentName(name) || 'item'
    let candidate = base
    let attempt = 1
    while (takenSlugs.has(candidate)) {
      attempt += 1
      candidate = `${base.slice(0, 36)}-${attempt}`
    }
    takenSlugs.add(candidate)
    return candidate
  }

  const groupSid = shortId()
  const groupSlug = nextSlug(source.name)

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `INSERT INTO \`contents\`
         (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`, \`fork_from_sid\`)
       VALUES (?, ?, 'group', ?, ?, ?, 'private', ?)`,
      [groupSid, viewer.uuid, groupSlug, source.name, source.intro, source.sid]
    )

    const [groupTags] = await conn.query<RowDataPacket[]>(
      'SELECT `tag_sid` FROM `content_tags` WHERE `content_sid` = ?',
      [source.sid]
    )
    for (const tag of groupTags) {
      await conn.execute(
        'INSERT INTO `content_tags` (`sid`, `content_sid`, `tag_sid`) VALUES (?, ?, ?)',
        [shortId(), groupSid, tag.tag_sid]
      )
    }

    for (const snippet of sourceSnippets) {
      const snippetSid = shortId()
      const snippetSlug = nextSlug(snippet.name as string)

      await conn.execute(
        `INSERT INTO \`contents\`
           (\`sid\`, \`owner_uuid\`, \`kind\`, \`slug\`, \`name\`, \`intro\`, \`visibility\`, \`fork_from_sid\`, \`group_sid\`, \`language_sid\`, \`code\`)
         VALUES (?, ?, 'snippet', ?, ?, ?, 'private', ?, ?, ?, ?)`,
        [snippetSid, viewer.uuid, snippetSlug, snippet.name, snippet.intro, snippet.sid, groupSid, snippet.language_sid, snippet.code]
      )

      const [snippetTags] = await conn.query<RowDataPacket[]>(
        'SELECT `tag_sid` FROM `content_tags` WHERE `content_sid` = ?',
        [snippet.sid]
      )
      for (const tag of snippetTags) {
        await conn.execute(
          'INSERT INTO `content_tags` (`sid`, `content_sid`, `tag_sid`) VALUES (?, ?, ?)',
          [shortId(), snippetSid, tag.tag_sid]
        )
      }

      const [dependencies] = await conn.query<RowDataPacket[]>(
        'SELECT `dependency_sid` FROM `snippet_dependencies` WHERE `snippet_sid` = ?',
        [snippet.sid]
      )
      for (const dependency of dependencies) {
        await conn.execute(
          'INSERT INTO `snippet_dependencies` (`sid`, `snippet_sid`, `dependency_sid`) VALUES (?, ?, ?)',
          [shortId(), snippetSid, dependency.dependency_sid]
        )
      }

      await conn.execute('UPDATE `contents` SET `fork_count` = `fork_count` + 1 WHERE `sid` = ?', [snippet.sid])
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

  return {
    group: { slug: groupSlug, name: source.name },
    snippetCount: sourceSnippets.length
  }
})
