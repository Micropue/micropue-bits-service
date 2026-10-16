import type { RowDataPacket } from 'mysql2/promise'

// 控制台依赖目录（只读列表）：全量 + 归属语言 + 被代码段引用计数
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const db = useDb()
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT d.\`sid\`, d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`intro\`, d.\`logo_url\`, d.\`link_url\`, d.\`sort_order\`, d.\`created_at\`,
            (SELECT COUNT(*) FROM \`snippet_dependencies\` sd WHERE sd.\`dependency_sid\` = d.\`sid\`) AS \`usage_count\`
       FROM \`dependencies\` d
      ORDER BY d.\`kind\` ASC, d.\`sort_order\` ASC, d.\`name\` ASC`
  )

  const [links] = await db.query<RowDataPacket[]>(
    `SELECT dl.\`dependency_sid\`, dl.\`is_primary\`, l.\`sid\` AS \`language_sid\`, l.\`name\`, l.\`slug\`
       FROM \`dependency_languages\` dl
       JOIN \`languages\` l ON l.\`sid\` = dl.\`language_sid\`
      ORDER BY dl.\`dependency_sid\` ASC, dl.\`is_primary\` DESC, dl.\`sort_order\` ASC, l.\`name\` ASC`
  )

  const byDependency = new Map<string, { sid: string, name: string, slug: string, isPrimary: boolean }[]>()
  for (const link of links) {
    const key = link.dependency_sid as string
    const list = byDependency.get(key) ?? []
    list.push({
      sid: link.language_sid as string,
      name: link.name as string,
      slug: link.slug as string,
      isPrimary: !!link.is_primary
    })
    byDependency.set(key, list)
  }

  return {
    dependencies: rows.map(row => {
      const languages = byDependency.get(row.sid as string) ?? []
      return {
        ...row,
        usage_count: Number(row.usage_count),
        languages,
        // 供表格筛选/搜索用的拼接字段（语言名）
        language_text: languages.map(language => language.name).join(', ')
      }
    })
  }
})
