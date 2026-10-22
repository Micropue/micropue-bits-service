import type { RowDataPacket } from 'mysql2/promise'
import { MAX_PINNED_PER_KIND } from '#shared/utils/moderation'

// 作者排序弹窗：返回置顶项（固定）与可拖拽的非置顶项
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)
  const query = getQuery(event)
  const kind = query.kind === 'group' ? 'group' : 'snippet'
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)
  const offset = Math.max(Number(query.offset) || 0, 0)

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`slug\`, \`name\`, \`visibility\`, \`pinned_at\`, \`sort_order\`, \`updated_at\`
       FROM \`contents\`
      WHERE \`owner_uuid\` = ? AND \`kind\` = ? AND \`deleted_at\` IS NULL
      ORDER BY (\`pinned_at\` IS NOT NULL) DESC, \`pinned_at\` DESC, \`sort_order\` ASC, \`updated_at\` DESC
      LIMIT 500`,
    [user.uuid, kind]
  )

  const pinned = rows
    .filter(row => row.pinned_at)
    .map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      visibility: row.visibility as string
    }))
  const unpinned = rows
    .filter(row => !row.pinned_at)
    .map(row => ({
      slug: row.slug as string,
      name: row.name as string,
      visibility: row.visibility as string
    }))

  return {
    pinned,
    items: unpinned.slice(offset, offset + limit),
    // 轻量返回完整顺序，保存时把未加载的条目按原顺序接在后面
    allSlugs: unpinned.map(item => item.slug),
    total: unpinned.length,
    hasMore: offset + limit < unpinned.length,
    maxPinned: MAX_PINNED_PER_KIND
  }
})
