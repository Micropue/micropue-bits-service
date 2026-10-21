// 删除代码段（本人）：软删；原地址不再可访问，保留收藏/反馈等关系
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const slug = String(getRouterParam(event, 'slug') ?? '')

  const [result] = await useDb().execute(
    "UPDATE `contents` SET `deleted_at` = NOW() WHERE `owner_uuid` = ? AND `slug` = ? AND `kind` = 'snippet' AND `deleted_at` IS NULL",
    [user.uuid, slug]
  ) as [{ affectedRows: number }, unknown]

  if (!result.affectedRows) throw createError({ statusCode: 404, statusMessage: 'Snippet not found' })
  return { ok: true }
})
