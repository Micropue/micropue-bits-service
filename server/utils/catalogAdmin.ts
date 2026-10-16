import type { RowDataPacket } from 'mysql2/promise'

// 目录条目（语言 / 依赖）的字段清洗：前后端同一套校验，写接口共用
// shortcut: 目录字段校验集中在这里；未来若加入「提交审核」流程，可复用同一套规则

export interface CatalogFieldSpec {
  key: string
  max: number
  required?: boolean
}

export const LANGUAGE_FIELDS: CatalogFieldSpec[] = [
  { key: 'name', max: 64, required: true },
  { key: 'intro', max: 500 },
  { key: 'logo_url', max: 512 },
  { key: 'link_url', max: 512 },
  { key: 'sort_order', max: 0 }
]

export const DEPENDENCY_KINDS = ['framework', 'library', 'tool', 'runtime'] as const

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/
const URL_RE = /^https?:\/\/[^\s]+$/i

// 只取需要的字段，做长度与格式校验；返回可直接入库的值
export function readCatalogBody(body: Record<string, unknown>) {
  const slug = String(body?.slug ?? '').trim().toLowerCase()
  const name = String(body?.name ?? '').trim()
  const intro = String(body?.intro ?? '').trim()
  const logoUrl = String(body?.logo_url ?? '').trim()
  const linkUrl = String(body?.link_url ?? '').trim()
  const sortOrder = Number(body?.sort_order ?? 0)
  const kind = String(body?.kind ?? 'library')

  if (!SLUG_RE.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug must be 1-40 lowercase letters, digits or dashes',
      data: { field: 'slug' }
    })
  }
  if (!name || name.length > 64) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required (max 64 characters)', data: { field: 'name' } })
  }
  if (intro.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Intro is too long (max 500)', data: { field: 'intro' } })
  }
  for (const [field, value] of [['logo_url', logoUrl], ['link_url', linkUrl]] as const) {
    if (value && (value.length > 512 || !URL_RE.test(value))) {
      throw createError({ statusCode: 400, statusMessage: 'Must be a http(s) URL', data: { field } })
    }
  }
  if (!Number.isFinite(sortOrder)) {
    throw createError({ statusCode: 400, statusMessage: 'Sort order must be a number', data: { field: 'sort_order' } })
  }
  if (!(DEPENDENCY_KINDS as readonly string[]).includes(kind)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown kind', data: { field: 'kind' } })
  }

  return {
    slug,
    name,
    intro,
    logoUrl: logoUrl || null,
    linkUrl: linkUrl || null,
    sortOrder: Math.trunc(sortOrder),
    kind
  }
}

// 语言 sid 列表：去重 + 顺序即主语言（首项 is_primary）
export function readLanguageSids(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const sids: string[] = []
  for (const item of value) {
    const sid = String(item ?? '').trim()
    if (sid && !seen.has(sid)) {
      seen.add(sid)
      sids.push(sid)
    }
  }
  return sids
}

// 唯一键冲突（slug / name）转成带字段提示的 409
export function rethrowDuplicate(err: unknown): never {
  const e = err as { code?: string, sqlMessage?: string }
  if (e.code === 'ER_DUP_ENTRY') {
    const field = /uk_\w+_name/.test(e.sqlMessage ?? '') ? 'name' : 'slug'
    throw createError({
      statusCode: 409,
      statusMessage: field === 'name' ? 'This name is already used' : 'This slug is already used',
      data: { field }
    })
  }
  throw err
}

export interface LanguageRow extends RowDataPacket {
  sid: string
  slug: string
  name: string
  logo_url: string | null
  intro: string
  link_url: string | null
  sort_order: number
  created_at: string
}

export async function fetchLanguageRow(sid: string): Promise<LanguageRow | null> {
  const [rows] = await useDb().query<LanguageRow[]>(
    `SELECT l.\`sid\`, l.\`slug\`, l.\`name\`, l.\`logo_url\`, l.\`intro\`, l.\`link_url\`, l.\`sort_order\`, l.\`created_at\`,
            (SELECT COUNT(*) FROM \`dependency_languages\` dl WHERE dl.\`language_sid\` = l.\`sid\`) AS \`dependency_count\`,
            (SELECT COUNT(*) FROM \`contents\` c WHERE c.\`language_sid\` = l.\`sid\` AND c.\`deleted_at\` IS NULL) AS \`content_count\`
       FROM \`languages\` l WHERE l.\`sid\` = ? LIMIT 1`,
    [sid]
  )
  const row = rows[0]
  if (!row) return null
  return { ...row, dependency_count: Number(row.dependency_count), content_count: Number(row.content_count) } as LanguageRow
}

export interface DependencyRow extends RowDataPacket {
  sid: string
  slug: string
  name: string
  kind: string
  intro: string
  logo_url: string | null
  link_url: string | null
  sort_order: number
  created_at: string
}

export async function fetchDependencyRow(sid: string): Promise<DependencyRow | null> {
  const [rows] = await useDb().query<DependencyRow[]>(
    `SELECT d.\`sid\`, d.\`slug\`, d.\`name\`, d.\`kind\`, d.\`intro\`, d.\`logo_url\`, d.\`link_url\`, d.\`sort_order\`, d.\`created_at\`,
            (SELECT COUNT(*) FROM \`dependency_languages\` dl WHERE dl.\`dependency_sid\` = d.\`sid\`) AS \`language_count\`
       FROM \`dependencies\` d WHERE d.\`sid\` = ? LIMIT 1`,
    [sid]
  )
  const row = rows[0]
  if (!row) return null
  return { ...row, language_count: Number(row.language_count) } as DependencyRow
}

// 依赖 ↔ 语言关联：整体替换（首项为主语言），事务内先删后插
export async function replaceDependencyLanguages(dependencySid: string, languageSids: string[]) {
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('DELETE FROM `dependency_languages` WHERE `dependency_sid` = ?', [dependencySid])
    if (languageSids.length) {
      const placeholders = languageSids.map(() => '(?, ?, ?, ?, ?)').join(', ')
      await conn.query(
        `INSERT INTO \`dependency_languages\` (\`sid\`,\`dependency_sid\`,\`language_sid\`,\`is_primary\`,\`sort_order\`)
         VALUES ${placeholders}`,
        languageSids.flatMap((languageSid, index) => [shortId(), dependencySid, languageSid, index === 0 ? 1 : 0, index * 10])
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// 依赖已归属的语言（主语言在前）
export async function fetchDependencyLanguages(dependencySid: string) {
  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT dl.\`language_sid\`, dl.\`is_primary\`, l.\`name\`, l.\`slug\`
       FROM \`dependency_languages\` dl
       JOIN \`languages\` l ON l.\`sid\` = dl.\`language_sid\`
      WHERE dl.\`dependency_sid\` = ?
      ORDER BY dl.\`is_primary\` DESC, dl.\`sort_order\` ASC, l.\`name\` ASC`,
    [dependencySid]
  )
  return rows.map(row => ({
    sid: row.language_sid as string,
    name: row.name as string,
    slug: row.slug as string,
    isPrimary: !!row.is_primary
  }))
}
