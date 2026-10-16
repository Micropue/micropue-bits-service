// 新建编程语言（catalog.write）
export default defineEventHandler(async event => {
  await requireAdmin(event, 'catalog.write')
  const body = await readBody<Record<string, unknown>>(event)
  const fields = readCatalogBody(body ?? {})
  const sid = shortId()

  try {
    await useDb().execute(
      'INSERT INTO `languages` (`sid`,`slug`,`name`,`logo_url`,`intro`,`link_url`,`sort_order`) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sid, fields.slug, fields.name, fields.logoUrl, fields.intro, fields.linkUrl, fields.sortOrder]
    )
  } catch (err) {
    rethrowDuplicate(err)
  }

  return { language: await fetchLanguageRow(sid) }
})
