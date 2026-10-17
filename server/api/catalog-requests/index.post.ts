import type { RowDataPacket } from 'mysql2/promise'

// 用户提交目录条目申请（新语言 / 新依赖）：需登录，只填最核心字段，其余由审核管理员补全
// 规则详见 docs-internal/项目综合设计.md「目录条目申请与审核」

const URL_RE = /^https?:\/\/[^\s]+$/i
const DEPENDENCY_KINDS = ['framework', 'library', 'tool', 'runtime']
const HOURLY_LIMIT = 5 // 每账户每小时提交上限

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{
    kind?: string
    name?: string
    link_url?: string
    dependency_kind?: string
    language_slugs?: unknown
  }>(event)

  const kind = String(body?.kind ?? '')
  if (kind !== 'language' && kind !== 'dependency') {
    throw createError({ statusCode: 400, statusMessage: 'Unknown request kind', data: { field: 'kind' } })
  }

  const name = String(body?.name ?? '').trim()
  if (name.length < 2 || name.length > 64) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be 2-64 characters', data: { field: 'name' } })
  }

  const linkUrl = String(body?.link_url ?? '').trim()
  if (!URL_RE.test(linkUrl) || linkUrl.length > 512) {
    throw createError({ statusCode: 400, statusMessage: 'Official website must be a http(s) URL', data: { field: 'link_url' } })
  }

  let dependencyKind: string | null = null
  let languageSids: string[] = []
  if (kind === 'dependency') {
    dependencyKind = String(body?.dependency_kind ?? '')
    if (!DEPENDENCY_KINDS.includes(dependencyKind)) {
      throw createError({ statusCode: 400, statusMessage: 'Please choose a type', data: { field: 'dependency_kind' } })
    }
    // 前端用公开的 slug 选择语言（不暴露内部 sid），这里换成 sid 落库
    const slugs = Array.isArray(body?.language_slugs)
      ? [...new Set((body.language_slugs as unknown[]).map(item => String(item ?? '').trim()).filter(Boolean))]
      : []
    if (!slugs.length) {
      throw createError({ statusCode: 400, statusMessage: 'Please choose at least one language', data: { field: 'language_slugs' } })
    }
    const [rows] = await useDb().query<RowDataPacket[]>(
      `SELECT \`sid\`, \`slug\` FROM \`languages\` WHERE \`slug\` IN (${slugs.map(() => '?').join(', ')})`,
      slugs
    )
    if (rows.length !== slugs.length) {
      throw createError({ statusCode: 400, statusMessage: 'Unknown language selected', data: { field: 'language_slugs' } })
    }
    // 保持用户勾选顺序（首项=主语言）
    const bySlug = new Map(rows.map(row => [row.slug as string, row.sid as string]))
    languageSids = slugs.map(slug => bySlug.get(slug)!)
    if (!languageSids.length) {
      throw createError({ statusCode: 400, statusMessage: 'Please choose at least one language', data: { field: 'language_slugs' } })
    }
  }

  const db = useDb()

  // 同一个名称已在目录里 → 直接告知，不必提交
  const catalogTable = kind === 'language' ? 'languages' : 'dependencies'
  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS \`count\` FROM \`${catalogTable}\` WHERE \`name\` = ?`,
    [name]
  )
  if (Number(existing[0]?.count ?? 0) > 0) {
    throw createError({ statusCode: 409, statusMessage: 'This entry is already in the catalog', data: { field: 'name' } })
  }

  // 同一账户对同名条目已有待审核申请 → 合并处理
  const [duplicate] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS `count` FROM `catalog_requests` WHERE `kind` = ? AND `name` = ? AND `status` = 'pending'",
    [kind, name]
  )
  if (Number(duplicate[0]?.count ?? 0) > 0) {
    throw createError({ statusCode: 409, statusMessage: 'A request for this name is already waiting for review', data: { field: 'name' } })
  }

  // 提交频次限制（按账户）
  const redis = useRedis()
  const quotaKey = `catalog:request:quota:${user.uuid}`
  const used = await redis.incr(quotaKey)
  if (used === 1) await redis.expire(quotaKey, 3600)
  if (used > HOURLY_LIMIT) {
    const ttl = await redis.ttl(quotaKey)
    await redis.decr(quotaKey)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests, please try again later',
      data: { retryAfterSeconds: Math.max(ttl, 1) }
    })
  }

  const sid = shortId()
  await db.execute(
    `INSERT INTO \`catalog_requests\`
       (\`sid\`,\`kind\`,\`user_uuid\`,\`contact_email\`,\`name\`,\`link_url\`,\`dependency_kind\`,\`language_sids\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sid, kind, user.uuid, user.email, name, linkUrl, dependencyKind, JSON.stringify(languageSids)]
  )

  return { ok: true, sid }
})
