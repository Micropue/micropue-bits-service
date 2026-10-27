// 当前控制台登录态（未登录返回 admin: null，避免前端把 401 当异常刷控制台）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  const admin = await getAdmin(event)
  return {
    admin: publicAdminOrNull(admin),
    // 高级权限验证剩余时间：顶栏倒计时与前端按钮守卫共用
    advancedGrantSeconds: admin ? await getAdvancedGrantSeconds(admin.uuid) : 0
  }
})
