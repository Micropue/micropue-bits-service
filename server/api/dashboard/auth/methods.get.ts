// 控制台登录页读取可用认证方式（公开接口：登录前就要决定渲染哪些入口）
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')
  return { methods: await getAuthMethods() }
})
