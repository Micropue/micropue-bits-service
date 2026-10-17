import type { RowDataPacket } from 'mysql2/promise'

// 通过申请：管理员补全信息后正式发布到目录（事务内建条目 + 标记申请）
// 通过后申请表留下 reviewed_by / published_sid 便于追溯
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)

  const sid = String(getRouterParam(event, 'sid') ?? '')
  const db = useDb()
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT * FROM `catalog_requests` WHERE `sid` = ? LIMIT 1',
    [sid]
  )
  const request = rows[0]
  if (!request) throw createError({ statusCode: 404, statusMessage: 'Request not found' })
  if (request.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'This request has already been reviewed' })
  }

  const kind = request.kind as 'language' | 'dependency'
  const body = await readBody<{
    slug?: string
    name?: string
    intro?: string
    logo_url?: string
    link_url?: string
    sort_order?: number
    kind?: string
    language_sids?: unknown
  }>(event)

  // 补全后的字段：与目录 CRUD 同一套校验
  const fields = readCatalogBody({
    slug: body?.slug,
    name: body?.name ?? request.name,
    intro: body?.intro,
    logo_url: body?.logo_url,
    link_url: body?.link_url ?? request.link_url,
    sort_order: body?.sort_order ?? 0,
    kind: body?.kind ?? request.dependency_kind ?? 'library'
  })

  // 依赖：语言以管理员在弹窗里确认的为准，缺省沿用申请里的
  const languageSids = body?.language_sids === undefined
    ? (Array.isArray(request.language_sids) ? (request.language_sids as string[]) : [])
    : readLanguageSids(body.language_sids)
  if (kind === 'dependency' && !languageSids.length) {
    throw createError({ statusCode: 400, statusMessage: 'Please choose at least one language', data: { field: 'language_sids' } })
  }
  // 申请提交后语言可能已被删除（dependency_languages 无外键）→ 先核对再写，避免留下孤儿关联
  if (kind === 'dependency') {
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT \`sid\` FROM \`languages\` WHERE \`sid\` IN (${languageSids.map(() => '?').join(', ')})`,
      languageSids
    )
    const alive = new Set(existing.map(row => row.sid as string))
    if (languageSids.some(languageSid => !alive.has(languageSid))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Some selected languages no longer exist — please choose again',
        data: { field: 'language_sids' }
      })
    }
  }

  const publishedSid = shortId()
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    if (kind === 'language') {
      await conn.execute(
        'INSERT INTO `languages` (`sid`,`slug`,`name`,`logo_url`,`intro`,`link_url`,`sort_order`) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [publishedSid, fields.slug, fields.name, fields.logoUrl, fields.intro, fields.linkUrl, fields.sortOrder]
      )
    } else {
      await conn.execute(
        'INSERT INTO `dependencies` (`sid`,`slug`,`name`,`kind`,`intro`,`logo_url`,`link_url`,`sort_order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [publishedSid, fields.slug, fields.name, fields.kind, fields.intro, fields.logoUrl, fields.linkUrl, fields.sortOrder]
      )
      const placeholders = languageSids.map(() => '(?, ?, ?, ?, ?)').join(', ')
      await conn.query(
        `INSERT INTO \`dependency_languages\` (\`sid\`,\`dependency_sid\`,\`language_sid\`,\`is_primary\`,\`sort_order\`)
         VALUES ${placeholders}`,
        languageSids.flatMap((languageSid, index) => [shortId(), publishedSid, languageSid, index === 0 ? 1 : 0, index * 10])
      )
    }

    // 带 status='pending' 条件 + 校验影响行数：两名管理员同时通过时只会有一次生效（另一个回滚）
    const [mark] = await conn.execute(
      "UPDATE `catalog_requests` SET `status` = 'approved', `reviewed_by` = ?, `reviewed_at` = NOW(), `published_sid` = ?, `reject_reason` = '' WHERE `sid` = ? AND `status` = 'pending'",
      [admin.uuid, publishedSid, sid]
    )
    if (mark.affectedRows !== 1) {
      throw createError({ statusCode: 409, statusMessage: 'This request has already been reviewed' })
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    rethrowDuplicate(err)
  } finally {
    conn.release()
  }

  return { ok: true, publishedSid, kind }
})
