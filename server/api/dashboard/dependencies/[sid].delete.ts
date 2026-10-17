import type { RowDataPacket } from 'mysql2/promise'

// 删除依赖：被代码段引用时拒绝；否则连带清理语言关联
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const current = await fetchDependencyRow(sid)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Dependency not found' })

  const [usage] = await useDb().query<RowDataPacket[]>(
    'SELECT COUNT(*) AS `count` FROM `snippet_dependencies` WHERE `dependency_sid` = ?',
    [sid]
  )
  const usageCount = Number(usage[0]?.count ?? 0)
  if (usageCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `This dependency is still used by ${usageCount} snippet${usageCount === 1 ? '' : 's'}`
    })
  }

  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('DELETE FROM `dependency_languages` WHERE `dependency_sid` = ?', [sid])
    await conn.execute('DELETE FROM `dependencies` WHERE `sid` = ?', [sid])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { ok: true }
})
