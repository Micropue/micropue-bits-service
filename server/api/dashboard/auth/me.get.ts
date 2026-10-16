// 当前控制台登录态（未登录返回 admin: null，避免前端把 401 当异常刷控制台）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  return { admin: publicAdminOrNull(await getAdmin(event)) }
})
