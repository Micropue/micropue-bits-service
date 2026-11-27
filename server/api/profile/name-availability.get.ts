import type { RowDataPacket } from 'mysql2/promise'
import { normalizeContentSlug, slugifyContentName } from '../../utils/contentInput'

// 创建 / 编辑时检测名称或自动生成的 URL 是否已被占用
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'profile:name-availability', 60, 60)
  const query = getQuery(event)
  const kind = query.kind === 'group' ? 'group' : 'snippet'
  const name = String(query.name ?? '').trim().slice(0, 60)
  const exclude = String(query.exclude ?? '').trim()
  const requestedSlug = normalizeContentSlug(query.slug)
  if (!name && !requestedSlug) return { available: true, slug: '' }

  const slug = requestedSlug ?? (slugifyContentName(name) || 'item')
  const db = useDb()

  // 唯一键覆盖软删除内容与历史别名，所以可用性检测也必须覆盖，否则会出现
  // “页面显示可用、INSERT 却因 ER_DUP_ENTRY 失败”的不一致。
  let excludeSid = ''
  if (exclude) {
    const [currentRows] = await db.query<RowDataPacket[]>(
      'SELECT `sid` FROM `contents` WHERE `owner_uuid` = ? AND `slug` = ? LIMIT 1',
      [user.uuid, exclude]
    )
    excludeSid = String(currentRows[0]?.sid ?? '')
  }

  const [slugRows] = await db.query<RowDataPacket[]>(
    `SELECT \`sid\`, \`slug\`, \`name\`, \`kind\`, \`visibility\`
       FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`slug\` = ?
        AND (? = '' OR \`sid\` <> ?)
      ORDER BY \`updated_at\` DESC
      LIMIT 1`,
    [user.uuid, slug, excludeSid, excludeSid]
  )
  const slugConflict = slugRows[0]
  if (slugConflict) {
    return {
      available: false,
      slug,
      reason: 'slug',
      existing: {
        slug: slugConflict.slug as string,
        name: slugConflict.name as string,
        kind: slugConflict.kind as string,
        visibility: slugConflict.visibility as string
      }
    }
  }

  const [[alias]] = await db.query(
    `SELECT a.\`content_sid\`, c.\`name\`, c.\`kind\`, c.\`visibility\`, c.\`slug\`
       FROM \`content_aliases\` a
       LEFT JOIN \`contents\` c ON c.\`sid\` = a.\`content_sid\`
         AND c.\`owner_uuid\` = a.\`owner_uuid\`
      WHERE a.\`owner_uuid\` = ? AND a.\`slug\` = ?
        AND (? = '' OR a.\`content_sid\` <> ?)
      LIMIT 1`,
    [user.uuid, slug, excludeSid, excludeSid]
  ) as [{
    content_sid: string
    name: string | null
    kind: string | null
    visibility: string | null
    slug: string | null
  }[], unknown]
  if (alias) {
    return {
      available: false,
      slug,
      reason: 'slug',
      ...(alias.name && alias.kind && alias.visibility && alias.slug
        ? {
            existing: {
              slug: alias.slug,
              name: alias.name,
              kind: alias.kind,
              visibility: alias.visibility
            }
          }
        : {})
    }
  }

  if (name) {
    const [nameRows] = await db.query<RowDataPacket[]>(
      `SELECT \`sid\`, \`slug\`, \`name\`, \`kind\`, \`visibility\`
         FROM \`contents\`
        WHERE \`owner_uuid\` = ? AND \`deleted_at\` IS NULL
          AND \`kind\` = ? AND \`name\` = ?
          AND (? = '' OR \`sid\` <> ?)
        ORDER BY \`updated_at\` DESC
        LIMIT 1`,
      [user.uuid, kind, name, excludeSid, excludeSid]
    )
    const nameConflict = nameRows[0]
    if (nameConflict) {
      return {
        available: false,
        slug,
        reason: 'name',
        existing: {
          slug: nameConflict.slug as string,
          name: nameConflict.name as string,
          kind: nameConflict.kind as string,
          visibility: nameConflict.visibility as string
        }
      }
    }
  }

  return { available: true, slug }
})
