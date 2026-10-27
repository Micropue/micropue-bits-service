import type { ResultSetHeader } from 'mysql2/promise'

// 控制台删除更新日志
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await assertAdvancedAccess(admin)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const [result] = await useDb().execute<ResultSetHeader>('DELETE FROM `changelogs` WHERE `sid` = ?', [sid])
  if (!result.affectedRows) throw createError({ statusCode: 404, statusMessage: 'Changelog not found' })
  return { ok: true }
})
