// 控制台路由守卫：未登录跳登录页并带回跳地址
// 服务端会话校验，SSR 直接 302、客户端导航同样生效
export default defineNuxtRouteMiddleware(async to => {
  const { user, fetchSession } = useAdminAuth()
  if (!user.value) await fetchSession()
  if (!user.value) {
    return navigateTo({ path: '/dashboard/auth', query: { redirect: to.fullPath } })
  }
})
