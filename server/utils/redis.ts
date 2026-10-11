import Redis from 'ioredis'

// Redis 单例：验证码校验会话、限频计数等临时数据（规范详见 项目综合设计.md「数据缓存」）
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  // Redis 故障时快速失败，不无限重试阻塞请求
  maxRetriesPerRequest: 2
})

// 避免 ioredis 默认的 error 事件在无监听器时抛异常
redis.on('error', err => {
  console.warn('[redis] 连接异常：', err.message)
})

export function useRedis() {
  return redis
}
