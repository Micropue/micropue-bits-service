import type { RowDataPacket } from 'mysql2/promise'

// 目录条目申请列表（后台审核用）：按类型 / 状态筛选，返回申请人邮箱与已发布条目
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  await requireAdmin(event)

  const query = getQuery(event)
  const kind = String(query.kind ?? '')
  const status = String(query.status ?? 'pending')

  const where: string[] = []
  const params: string[] = []
  if (kind === 'language' || kind === 'dependency') {
    where.push('r.`kind` = ?')
    params.push(kind)
  }
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    where.push('r.`status` = ?')
    params.push(status)
  }

  const db = useDb()
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT r.\`sid\`, r.\`kind\`, r.\`status\`, r.\`contact_email\`, r.\`name\`, r.\`link_url\`,
            r.\`dependency_kind\`, r.\`language_sids\`, r.\`reject_reason\`, r.\`reviewed_at\`, r.\`published_sid\`, r.\`created_at\`
       FROM \`catalog_requests\` r
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.\`created_at\` DESC
      LIMIT 500`,
    params
  )

  // 依赖申请要带上语言名（以及主语言标记）
  const allSids = [...new Set(rows.flatMap(row => normalizeSids(row.language_sids)))]
  const languageMap = new Map<string, string>()
  if (allSids.length) {
    const [languages] = await db.query<RowDataPacket[]>(
      `SELECT \`sid\`, \`name\` FROM \`languages\` WHERE \`sid\` IN (${allSids.map(() => '?').join(', ')})`,
      allSids
    )
    for (const language of languages) languageMap.set(language.sid as string, language.name as string)
  }

  return {
    requests: rows.map(row => {
      const sids = normalizeSids(row.language_sids)
      const languages = sids.map((sid, index) => ({
        sid,
        name: languageMap.get(sid) ?? '(deleted)',
        isPrimary: index === 0
      }))
      return {
        ...row,
        language_sids: sids,
        languages,
        language_text: languages.map(language => language.name).join(', ')
      }
    }),
    counts: await countsByStatus(kind)
  }
})

function normalizeSids(value: unknown): string[] {
  const list = typeof value === 'string'
    ? (() => {
        try {
          return JSON.parse(value)
        } catch {
          return []
        }
      })()
    : value
  return Array.isArray(list) ? list.map(item => String(item)) : []
}

async function countsByStatus(kind: string) {
  const params: string[] = []
  let where = ''
  if (kind === 'language' || kind === 'dependency') {
    where = 'WHERE `kind` = ?'
    params.push(kind)
  }
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT \`status\`, COUNT(*) AS \`count\` FROM \`catalog_requests\` ${where} GROUP BY \`status\``,
    params
  )
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 }
  for (const row of rows) counts[row.status as string] = Number(row.count)
  return counts
}
