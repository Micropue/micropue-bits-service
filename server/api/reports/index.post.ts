import type { RowDataPacket } from 'mysql2/promise'
import { isReportTargetKind, isValidReportType } from '#shared/utils/moderation'

const HOURLY_LIMIT = 10

// 举报用户 / 代码段 / 分组：统一写入 reports 表
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{
    targetKind?: string
    username?: string
    slug?: string
    type?: string
    detail?: string
  }>(event)

  const targetKind = String(body?.targetKind ?? '')
  if (!isReportTargetKind(targetKind)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid report target' })
  }
  const type = String(body?.type ?? '')
  if (!isValidReportType(targetKind, type)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a report type', data: { field: 'type' } })
  }
  const detail = String(body?.detail ?? '').trim()
  if (detail.length < 2 || detail.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Report must be 2-500 characters', data: { field: 'detail' } })
  }

  const username = String(body?.username ?? '').trim()
  const owner = await findPublicUser(username)
  if (!owner) throw createError({ statusCode: 404, statusMessage: 'Report target not found' })

  let targetRef = ''
  let storedKind: 'user' | 'content' = 'content'
  if (targetKind === 'user') {
    if (owner.uuid === user.uuid) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot report yourself' })
    }
    targetRef = owner.uuid
    storedKind = 'user'
  } else {
    const slug = String(body?.slug ?? '').trim()
    const [rows] = await useDb().query<RowDataPacket[]>(
      `SELECT \`sid\`, \`kind\`, \`visibility\` FROM \`contents\`
        WHERE \`owner_uuid\` = ? AND \`slug\` = ? AND \`deleted_at\` IS NULL LIMIT 1`,
      [owner.uuid, slug]
    )
    const content = rows[0]
    if (!content || content.kind !== targetKind || content.visibility !== 'public') {
      throw createError({ statusCode: 404, statusMessage: 'Report target not found' })
    }
    if (owner.uuid === user.uuid) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot report your own content' })
    }
    targetRef = content.sid as string
  }

  const [existing] = await useDb().query<RowDataPacket[]>(
    `SELECT 1 FROM \`reports\`
      WHERE \`reporter_uuid\` = ? AND \`target_kind\` = ? AND \`target_ref\` = ? AND \`status\` = 'pending'
      LIMIT 1`,
    [user.uuid, storedKind, targetRef]
  )
  if (existing.length) {
    throw createError({ statusCode: 409, statusMessage: 'You already reported this target' })
  }

  const redis = useRedis()
  const quotaKey = `report:user:${user.uuid}:${Math.floor(Date.now() / 3600000)}`
  const used = await redis.incr(quotaKey)
  if (used === 1) await redis.expire(quotaKey, 3600)
  if (used > HOURLY_LIMIT) {
    throw createError({ statusCode: 429, statusMessage: 'Too many reports, please try again later' })
  }

  await useDb().execute(
    `INSERT INTO \`reports\` (\`sid\`, \`reporter_uuid\`, \`target_kind\`, \`target_ref\`, \`type\`, \`detail\`)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [shortId(), user.uuid, storedKind, targetRef, type, detail]
  )

  return { ok: true }
})
