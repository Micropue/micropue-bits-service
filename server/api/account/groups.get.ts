import type { RowDataPacket } from 'mysql2/promise'

// 我的分组列表（编辑代码段时的“所属分组”选项）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const user = await requireAuth(event)

  const [rows] = await useDb().query<RowDataPacket[]>(
    "SELECT `slug`, `name` FROM `contents` WHERE `owner_uuid` = ? AND `kind` = 'group' AND `deleted_at` IS NULL ORDER BY `name`",
    [user.uuid]
  )
  return { groups: rows.map(row => ({ slug: row.slug, name: row.name })) }
})
