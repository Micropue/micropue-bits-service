// 管理员管理仅对高级权限管理员开放；普通管理员直接回到概览
export default defineNuxtRouteMiddleware(async () => {
  const { user, fetchSession } = useAdminAuth()
  if (!user.value) await fetchSession()
  if (!user.value?.advanced) return navigateTo('/dashboard')
})
