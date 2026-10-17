// 修改依赖：字段可局部更新；带 language_sids 时整体替换归属语言
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const current = await fetchDependencyRow(sid)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Dependency not found' })

  const body = await readBody<Record<string, unknown>>(event)
  const fields = readCatalogBody({ ...current, ...(body ?? {}), sort_order: body?.sort_order ?? current.sort_order })

  try {
    await useDb().execute(
      'UPDATE `dependencies` SET `slug` = ?, `name` = ?, `kind` = ?, `intro` = ?, `logo_url` = ?, `link_url` = ?, `sort_order` = ? WHERE `sid` = ?',
      [fields.slug, fields.name, fields.kind, fields.intro, fields.logoUrl, fields.linkUrl, fields.sortOrder, sid]
    )
  } catch (err) {
    rethrowDuplicate(err)
  }

  if (body?.language_sids !== undefined) await replaceDependencyLanguages(sid, readLanguageSids(body.language_sids))

  const row = await fetchDependencyRow(sid)
  const languages = await fetchDependencyLanguages(sid)
  return { dependency: { ...row, languages, language_text: languages.map(language => language.name).join(', ') } }
})
