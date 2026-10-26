import type { RowDataPacket } from 'mysql2/promise'
import { DOC_CHAPTERS } from '../../app/data/docs'

// sitemap.xml：站点公开页面清单
// 只收录可公开访问的页面；unlisted / private 内容和不索引页面不进入 sitemap
interface SitemapEntry {
  path: string
  lastmod: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => XML_ESCAPES[char])

function isoDate(value: unknown) {
  if (!value) return new Date().toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value as string).toISOString().slice(0, 10)
}

export default defineEventHandler(async event => {
  const base = String(useRuntimeConfig(event).public.siteUrl).replace(/\/+$/, '')
  const today = new Date().toISOString().slice(0, 10)
  const staticEntries: SitemapEntry[] = [
    { path: '/', lastmod: today, changefreq: 'daily', priority: 1 },
    { path: '/languages', lastmod: today, changefreq: 'weekly', priority: 0.9 },
    { path: '/dependencies', lastmod: today, changefreq: 'weekly', priority: 0.9 },
    { path: '/docs', lastmod: today, changefreq: 'monthly', priority: 0.8 },
    { path: '/changelog', lastmod: today, changefreq: 'weekly', priority: 0.8 },
    { path: '/request', lastmod: today, changefreq: 'monthly', priority: 0.6 },
    { path: '/legal/terms', lastmod: today, changefreq: 'yearly', priority: 0.5 },
    { path: '/legal/privacy', lastmod: today, changefreq: 'yearly', priority: 0.5 },
    { path: '/legal/cookies', lastmod: today, changefreq: 'yearly', priority: 0.4 }
  ]

  const db = useDb()
  const [languageRows] = await db.query<RowDataPacket[]>(
    'SELECT `slug`, `created_at` FROM `languages`'
  )
  const [dependencyRows] = await db.query<RowDataPacket[]>(
    'SELECT `slug`, `kind`, `created_at` FROM `dependencies`'
  )
  const [userRows] = await db.query<RowDataPacket[]>(
    `SELECT u.\`username\`,
            DATE_FORMAT(GREATEST(u.\`created_at\`, COALESCE(MAX(c.\`updated_at\`), u.\`created_at\`)), '%Y-%m-%d') AS \`lastmod\`
       FROM \`users\` u
       LEFT JOIN \`contents\` c
         ON c.\`owner_uuid\` = u.\`uuid\`
        AND c.\`deleted_at\` IS NULL
        AND c.\`visibility\` = 'public'
      WHERE u.\`status\` = 'normal'
        AND u.\`username\` <> u.\`email\`
      GROUP BY u.\`uuid\`, u.\`username\`, u.\`created_at\``
  )
  const [contentRows] = await db.query<RowDataPacket[]>(
    `SELECT u.\`username\`, c.\`slug\`, c.\`kind\`, c.\`updated_at\`
       FROM \`contents\` c
       JOIN \`users\` u ON u.\`uuid\` = c.\`owner_uuid\`
      WHERE c.\`kind\` IN ('snippet', 'group')
        AND c.\`deleted_at\` IS NULL
        AND c.\`visibility\` = 'public'
        AND u.\`status\` = 'normal'
        AND u.\`username\` <> u.\`email\``
  )

  const entries: SitemapEntry[] = [
    ...staticEntries,
    ...DOC_CHAPTERS.map(chapter => ({
      path: `/docs/${chapter.slug}`,
      lastmod: today,
      changefreq: 'monthly' as const,
      priority: 0.7
    })),
    ...languageRows.map(row => ({
      path: `/language/${encodeURIComponent(String(row.slug))}`,
      lastmod: isoDate(row.created_at),
      changefreq: 'monthly' as const,
      priority: 0.6
    })),
    ...dependencyRows.map(row => ({
      path: `/${encodeURIComponent(String(row.kind))}/${encodeURIComponent(String(row.slug))}`,
      lastmod: isoDate(row.created_at),
      changefreq: 'monthly' as const,
      priority: 0.5
    })),
    ...userRows.map(row => ({
      path: `/${encodeURIComponent(String(row.username))}`,
      lastmod: isoDate(row.lastmod),
      changefreq: 'weekly' as const,
      priority: 0.7
    })),
    ...contentRows.map(row => ({
      path: `/${encodeURIComponent(String(row.username))}/${encodeURIComponent(String(row.slug))}`,
      lastmod: isoDate(row.updated_at),
      changefreq: row.kind === 'snippet' ? 'weekly' as const : 'monthly' as const,
      priority: row.kind === 'snippet' ? 0.7 : 0.6
    }))
  ]

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${escapeXml(base + entry.path)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`
})
