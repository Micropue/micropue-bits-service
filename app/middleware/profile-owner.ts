// 个人主页的私有子页面（收藏 / 反馈举报 / 目录申请）仅允许本人访问
export default defineNuxtRouteMiddleware(async to => {
  const username = String(to.params.username ?? '')
  if (!username) return

  const request = useRequestFetch()
  try {
    const data = await request<{ profile?: { isOwner: boolean } }>(
      `/api/users/${encodeURIComponent(username)}`
    )
    if (!data.profile?.isOwner) {
      throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    }
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    }
    throw err
  }
})
