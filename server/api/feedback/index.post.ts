import { isValidFeedbackType } from '#shared/utils/moderation'

const HOURLY_LIMIT = 10

// 对代码段提交反馈：反馈给作者，仅支持代码段
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const body = await readBody<{ username?: string, slug?: string, type?: string, detail?: string }>(event)

  const username = String(body?.username ?? '').trim()
  const slug = String(body?.slug ?? '').trim()
  const type = String(body?.type ?? '')
  const detail = String(body?.detail ?? '').trim()
  if (!isValidFeedbackType(type)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a feedback type', data: { field: 'type' } })
  }
  if (detail.length < 2 || detail.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback must be 2-500 characters', data: { field: 'detail' } })
  }

  const author = await findPublicUser(username)
  if (!author) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  const snippet = await fetchSnippetBySlug(author.uuid, slug)
  if (!snippet || snippet.visibility === 'private') {
    throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  }
  if (author.uuid === user.uuid) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot send feedback on your own snippet' })
  }

  const redis = useRedis()
  const quotaKey = `feedback:user:${user.uuid}:${Math.floor(Date.now() / 3600000)}`
  const used = await redis.incr(quotaKey)
  if (used === 1) await redis.expire(quotaKey, 3600)
  if (used > HOURLY_LIMIT) {
    throw createError({ statusCode: 429, statusMessage: 'Too many feedback submissions, please try again later' })
  }

  await useDb().execute(
    'INSERT INTO `feedback` (`sid`, `user_uuid`, `content_sid`, `type`, `detail`) VALUES (?, ?, ?, ?, ?)',
    [shortId(), user.uuid, snippet.sid, type, detail]
  )

  return { ok: true }
})
