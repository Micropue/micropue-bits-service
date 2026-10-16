// 新建依赖（catalog.write）：可选带上归属语言，首项为主语言
export default defineEventHandler(async event => {
  await requireAdmin(event, 'catalog.write')
  const body = await readBody<Record<string, unknown>>(event)
  const fields = readCatalogBody(body ?? {})
  const languageSids = readLanguageSids(body?.language_sids)
  const sid = shortId()

  try {
    await useDb().execute(
      'INSERT INTO `dependencies` (`sid`,`slug`,`name`,`kind`,`intro`,`logo_url`,`link_url`,`sort_order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sid, fields.slug, fields.name, fields.kind, fields.intro, fields.logoUrl, fields.linkUrl, fields.sortOrder]
    )
  } catch (err) {
    rethrowDuplicate(err)
  }

  if (languageSids.length) await replaceDependencyLanguages(sid, languageSids)

  const row = await fetchDependencyRow(sid)
  return { dependency: { ...row, languages: await fetchDependencyLanguages(sid), language_text: '', usage_count: 0 } }
})
