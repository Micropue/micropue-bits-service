// 旧开发者文档地址永久迁移到公开文档区
export default defineEventHandler(event => {
  const path = getRequestURL(event).pathname
  if (path !== '/developer/docs' && !path.startsWith('/developer/docs/')) return

  const suffix = path.slice('/developer/docs'.length)
  sendRedirect(event, `/docs/developer${suffix}`, 301)
})
