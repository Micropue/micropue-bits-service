import type { RowDataPacket } from 'mysql2/promise'

// 标签列表（公开）：创建代码段时的建议标签；自由创建，不强制从这里选
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const [tags] = await useDb().query<RowDataPacket[]>(
    'SELECT `tag_key`, `name` FROM `tags` ORDER BY `created_at` DESC LIMIT 200'
  )
  return { tags }
})
