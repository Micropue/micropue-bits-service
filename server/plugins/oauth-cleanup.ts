import { cleanupOAuthTokens } from '../utils/db'

// 每 6 小时清理一次过期/撤销的 OAuth token；启动时 ensureSchema 已先清理一次
export default defineNitroPlugin(() => {
  const timer = setInterval(() => {
    cleanupOAuthTokens().catch(err => {
      console.warn('[oauth] token 清理失败：', err instanceof Error ? err.message : err)
    })
  }, 6 * 3600 * 1000)
  timer.unref?.()
})
