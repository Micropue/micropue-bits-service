// 修改编程语言（catalog.write）：slug 允许改，改后旧链接由前台自行处理
export default defineEventHandler(async event => {
  await requireAdmin(event, 'catalog.write')
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const current = await fetchLanguageRow(sid)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Language not found' })

  const body = await readBody<Record<string, unknown>>(event)
  const fields = readCatalogBody({ ...current, ...(body ?? {}), sort_order: body?.sort_order ?? current.sort_order })

  try {
    await useDb().execute(
      'UPDATE `languages` SET `slug` = ?, `name` = ?, `logo_url` = ?, `intro` = ?, `link_url` = ?, `sort_order` = ? WHERE `sid` = ?',
      [fields.slug, fields.name, fields.logoUrl, fields.intro, fields.linkUrl, fields.sortOrder, sid]
    )
  } catch (err) {
    rethrowDuplicate(err)
  }

  return { language: await fetchLanguageRow(sid) }
})
