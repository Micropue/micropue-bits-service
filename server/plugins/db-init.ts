import { ensureSchema } from '../utils/db'

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

export default defineNitroPlugin(async () => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await ensureSchema()
      console.log('[db] users 表已就绪')
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[db] MySQL 连接失败（第 ${attempt}/${MAX_ATTEMPTS} 次），${RETRY_DELAY_MS}ms 后重试：${message}`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      } else {
        console.warn(`[db] 跳过自动建表：MySQL 不可用（${message}）。请确认 docker compose 已启动，下次启动服务时会重试。`)
      }
    }
  }
})
