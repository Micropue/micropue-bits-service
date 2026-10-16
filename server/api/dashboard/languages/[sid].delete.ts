// 删除编程语言（catalog.write）：被代码段引用时拒绝；仅被依赖关联时级联清理关联
export default defineEventHandler(async event => {
  await requireAdmin(event, 'catalog.write')
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const current = await fetchLanguageRow(sid)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Language not found' })

  const contentCount = Number(current.content_count ?? 0)
  if (contentCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `This language is still used by ${contentCount} snippet${contentCount === 1 ? '' : 's'}`
    })
  }

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('DELETE FROM `dependency_languages` WHERE `language_sid` = ?', [sid])
    await conn.execute('DELETE FROM `languages` WHERE `sid` = ?', [sid])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { ok: true }
})
