import type { RowDataPacket } from 'mysql2/promise'

// sitemap.xml：站点公开页面清单（首页、目录索引页、法务页 + 全部语言与目录条目详情页）
// 目录清单页按分组随机截断，这里列出全量条目，保证落选项也能被搜索引擎抓到
const STATIC_PATHS = ['/', '/languages', '/dependencies', '/legal/terms', '/legal/privacy', '/legal/cookies']

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => XML_ESCAPES[char])

export default defineEventHandler(async event => {
  const base = String(useRuntimeConfig(event).public.siteUrl).replace(/\/+$/, '')

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT 'language' AS \`kind\`, \`slug\` FROM \`languages\`
     UNION ALL
     SELECT \`kind\`, \`slug\` FROM \`dependencies\``
  )

  const paths = [
    ...STATIC_PATHS,
    ...rows.map(row => (row.kind === 'language' ? `/language/${row.slug}` : `/${row.kind}/${row.slug}`))
  ]

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  // 只有 <loc>：changefreq/priority 已被搜索引擎忽略，lastmod 用 created_at 会误导抓取
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(path => `  <url><loc>${escapeXml(base + path)}</loc></url>`).join('\n')}
</urlset>
`
})
