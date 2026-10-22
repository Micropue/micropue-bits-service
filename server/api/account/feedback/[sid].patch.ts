import type { RowDataPacket } from 'mysql2/promise'

// 作者更新自己代码段反馈的状态
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const sid = String(getRouterParam(event, 'sid') ?? '')
  const body = await readBody<{ status?: string }>(event)
  const status = String(body?.status ?? '')
  if (!['open', 'read', 'closed'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const [rows] = await useDb().query<RowDataPacket[]>(
    `SELECT f.\`sid\` FROM \`feedback\` f
       JOIN \`contents\` c ON c.\`sid\` = f.\`content_sid\`
      WHERE f.\`sid\` = ? AND c.\`owner_uuid\` = ? AND c.\`kind\` = 'snippet' LIMIT 1`,
    [sid, user.uuid]
  )
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Feedback not found' })

  await useDb().execute('UPDATE `feedback` SET `status` = ? WHERE `sid` = ?', [status, sid])
  return { ok: true, status }
})
