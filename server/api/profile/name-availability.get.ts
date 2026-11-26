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
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT \`sid\`, \`slug\`, \`name\`, \`kind\`, \`visibility\`
       FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`deleted_at\` IS NULL
        AND (\`slug\` = ? OR (? = '' AND \`kind\` = ? AND \`name\` = ?))
        AND (? = '' OR \`slug\` <> ?)
      ORDER BY \`updated_at\` DESC
      LIMIT 1`,
    [user.uuid, slug, requestedSlug ? '' : name, kind, name, exclude, exclude]
  )
  const conflict = rows[0]
  if (conflict) {
    return {
      available: false,
      slug,
      reason: conflict.slug === slug ? 'slug' : 'name',
      existing: {
        slug: conflict.slug as string,
        name: conflict.name as string,
        kind: conflict.kind as string,
        visibility: conflict.visibility as string
      }
    }
  }

  const [[alias]] = await db.query(
    `SELECT a.\`content_sid\`, c.\`name\`, c.\`kind\`, c.\`visibility\`, c.\`slug\`
       FROM \`content_aliases\` a
       JOIN \`contents\` c ON c.\`sid\` = a.\`content_sid\` AND c.\`deleted_at\` IS NULL
      WHERE a.\`owner_uuid\` = ? AND a.\`slug\` = ?
        AND (? = '' OR a.\`content_sid\` <> (
          SELECT \`sid\` FROM \`contents\` WHERE \`owner_uuid\` = ? AND \`slug\` = ? LIMIT 1
        ))
      LIMIT 1`,
    [user.uuid, slug, exclude, user.uuid, exclude]
  ) as [{ content_sid: string, name: string, kind: string, visibility: string, slug: string }[], unknown]
  if (alias) {
    return {
      available: false,
      slug,
      reason: 'slug',
      existing: {
        slug: alias.slug,
        name: alias.name,
        kind: alias.kind,
        visibility: alias.visibility
      }
    }
  }

  return { available: true, slug }
})
