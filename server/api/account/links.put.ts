// 我的开放链接（整组替换）：最多 6 条，仅 http(s)
const MAX_LINKS = 6
const URL_RE = /^https?:\/\/[^\s]+$/i

interface LinkInput {
  label: string
  url: string
}

function readLinks(value: unknown): LinkInput[] {
  if (!Array.isArray(value)) return []
  const links: LinkInput[] = []
  for (const raw of value.slice(0, MAX_LINKS)) {
    const item = (raw ?? {}) as { label?: unknown, url?: unknown }
    const label = String(item.label ?? '').trim().slice(0, 32)
    const url = String(item.url ?? '').trim()
    if (!label || !url) continue
    if (url.length > 512 || !URL_RE.test(url)) {
      throw createError({ statusCode: 400, statusMessage: 'Links must be http(s) URLs', data: { field: 'links' } })
    }
    links.push({ label, url })
  }
  return links
}

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  await enforceUserRateLimit(event, user.uuid, 'account:links', 10, 3600)
  const body = await readBody<{ links?: unknown }>(event)
  const links = readLinks(body?.links)

  const db = useDb()
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('DELETE FROM `user_links` WHERE `user_uuid` = ?', [user.uuid])
    for (const [index, link] of links.entries()) {
      await conn.execute(
        'INSERT INTO `user_links` (`sid`, `user_uuid`, `platform`, `label`, `url`, `sort_order`) VALUES (?, ?, ?, ?, ?, ?)',
        [shortId(), user.uuid, 'custom', link.label, link.url, index * 10]
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { links }
})
