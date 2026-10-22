import type { ResultSetHeader } from 'mysql2/promise'

// 删除草稿 / 发送记录
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const [result] = await useDb().execute<ResultSetHeader>('DELETE FROM `admin_emails` WHERE `sid` = ?', [sid])
  if (!result.affectedRows) throw createError({ statusCode: 404, statusMessage: 'Email not found' })
  return { ok: true }
})
