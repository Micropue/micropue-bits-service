import type { ResultSetHeader } from 'mysql2/promise'

// 控制台删除举报记录
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await assertAdvancedAccess(admin)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const [result] = await useDb().execute<ResultSetHeader>('DELETE FROM `reports` WHERE `sid` = ?', [sid])
  if (!result.affectedRows) throw createError({ statusCode: 404, statusMessage: 'Report not found' })
  return { ok: true }
})
