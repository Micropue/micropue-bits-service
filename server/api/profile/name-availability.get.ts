import type { RowDataPacket } from 'mysql2/promise'
import { slugifyContentName } from '../../utils/contentInput'

// 创建 / 编辑时检测名称或自动生成的 URL 是否已被占用
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const query = getQuery(event)
  const kind = query.kind === 'group' ? 'group' : 'snippet'
  const name = String(query.name ?? '').trim().slice(0, 60)
  const exclude = String(query.exclude ?? '').trim()
  if (!name) return { available: true, slug: '' }

  const slug = slugifyContentName(name) || 'item'
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`slug\`, \`name\`, \`kind\`, \`visibility\`
       FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`deleted_at\` IS NULL
        AND (\`slug\` = ? OR (\`kind\` = ? AND \`name\` = ?))
        AND (? = '' OR \`slug\` <> ?)
      ORDER BY \`updated_at\` DESC
      LIMIT 1`,
    [user.uuid, slug, kind, name, exclude, exclude]
  )
  const conflict = rows[0]
  if (!conflict) return { available: true, slug }

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
})
