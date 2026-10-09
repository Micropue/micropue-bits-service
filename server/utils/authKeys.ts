// 认证相关 Redis 键（发送/校验多处共享，避免字符串漂移）
export const AUTH_KEYS = {
  // 验证码校验会话：uid → { email, code, attempts? }
  session: (uid: string) => `auth:email:session:${uid}`,
  // 邮箱当前活跃会话映射（重发即替换并删除旧会话）
  active: (email: string) => `auth:email:active:${email}`,
  // 重发冷却
  cooldown: (email: string) => `auth:email:cooldown:${email}`,
  // 每邮箱小时限额
  quota: (email: string) => `auth:email:quota:${email}`,
  // 每 IP 小时限额
  ipQuota: (ip: string) => `auth:ip:quota:${ip}`
}
