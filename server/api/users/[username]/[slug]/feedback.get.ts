import type { RowDataPacket } from 'mysql2/promise'

// 代码段公开反馈（类似评论区）：作者与访客都能查看
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()
  const [viewer, owner] = await Promise.all([getAuthUser(event), findPublicUser(username)])
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const snippet = await fetchSnippetBySlug(owner.uuid, slug)
  if (!snippet || (snippet.visibility === 'private' && viewer?.uuid !== owner.uuid)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50)
  const offset = Math.max(Number(query.offset) || 0, 0)
  const q = String(query.q ?? '').trim().slice(0, 120)
  const params: (string | number)[] = [snippet.sid]
  const search = q
    ? (() => {
        const pattern = `%${q.replace(/[\\%_]/g, char => `\\${char}`)}%`
        params.push(pattern, pattern, pattern, pattern)
        return '(f.`detail` LIKE ? OR f.`type` LIKE ? OR u.`nickname` LIKE ? OR u.`username` LIKE ?)'
      })()
    : '1 = 1'

  const [[countRow]] = await useDb().query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`total\` FROM \`feedback\` f JOIN \`users\` u ON u.\`uuid\` = f.\`user_uuid\`
      WHERE f.\`content_sid\` = ? AND ${search}`,
    params
  )
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT f.\`sid\`, f.\`type\`, f.\`detail\`, f.\`created_at\`,
            CASE WHEN u.\`username\` <> u.\`email\` THEN u.\`username\` END AS \`username\`,
            u.\`nickname\`, u.\`github_id\`
       FROM \`feedback\` f
       JOIN \`users\` u ON u.\`uuid\` = f.\`user_uuid\`
      WHERE f.\`content_sid\` = ? AND ${search}
      ORDER BY f.\`created_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  return {
    items: rows.map(row => ({
      sid: row.sid as string,
      type: row.type as string,
      detail: row.detail as string,
      createdAt: row.created_at as string,
      from: {
        username: row.username as string | null,
        nickname: row.nickname as string,
        avatarUrl: githubAvatar(row.github_id)
      }
    })),
    total: Number(countRow?.total ?? 0)
  }
})
