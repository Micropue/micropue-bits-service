import type { RowDataPacket } from 'mysql2/promise'
import { MAX_PINNED_PER_KIND } from '#shared/utils/moderation'

// 作者排序弹窗：返回置顶项（固定）与可拖拽的非置顶项
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const query = getQuery(event)
  const kind = query.kind === 'group' ? 'group' : 'snippet'

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`slug\`, \`name\`, \`visibility\`, \`pinned_at\`, \`sort_order\`, \`updated_at\`
       FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`kind\` = ? AND \`deleted_at\` IS NULL
      ORDER BY (\`pinned_at\` IS NOT NULL) DESC, \`pinned_at\` DESC, \`sort_order\` ASC, \`updated_at\` DESC
      LIMIT 500`,
    [user.uuid, kind]
  )

  const items = rows.map(row => ({
    slug: row.slug as string,
    name: row.name as string,
    visibility: row.visibility as string,
    pinned: !!row.pinned_at
  }))
  return {
    pinned: items.filter(item => item.pinned),
    items: items.filter(item => !item.pinned),
    maxPinned: MAX_PINNED_PER_KIND,
    truncated: rows.length >= 500
  }
})
