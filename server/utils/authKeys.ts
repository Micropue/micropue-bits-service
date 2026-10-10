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
  ipQuota: (ip: string) => `auth:ip:quota:${ip}`,
  // 发码限额：IP × 邮箱 组合（同一 IP 对同一邮箱的频次）
  sendPair: (ip: string, email: string) => `auth:send:pair:${ip}:${email}`,
  // 账户级错码计数（跨会话，用于锁定）
  fail: (email: string) => `auth:email:fail:${email}`,
  // 账户临时锁定（存在即禁止新设备登录 / 发码）
  lock: (email: string) => `auth:email:lock:${email}`,
  // 邮箱修改冷却：每账户 24 小时内最多修改一次（值为上次修改时间戳）
  emailChange: (uuid: string) => `auth:email:change:${uuid}`,
  // 密码修改冷却：每账户 1 小时内最多修改一次
  passwordChange: (uuid: string) => `auth:password:change:${uuid}`,
  // GitHub OAuth state（防 CSRF，携带 mode 与绑定目标）
  githubState: (state: string) => `auth:github:state:${state}`,
  // WebAuthn 注册 challenge（按用户）
  webauthnReg: (uuid: string) => `auth:webauthn:reg:${uuid}`,
  // WebAuthn 登录 challenge（无用户名，随机 challengeId）
  webauthnAuth: (challengeId: string) => `auth:webauthn:auth:${challengeId}`,
  // AuthApp 待激活密钥（按用户，激活前临时存放）
  totpSetup: (uuid: string) => `auth:totp:setup:${uuid}`,
  // AuthApp 动态码已用时间步（防重放）
  totpStep: (uuid: string) => `auth:totp:step:${uuid}`,
  // 两步验证待校验票据（第一因子通过后、第二因子完成前）
  twoFaTicket: (ticket: string) => `auth:2fa:ticket:${ticket}`,
  // 两步验证第二因子错码计数（按票据）
  twoFaFail: (ticket: string) => `auth:2fa:fail:${ticket}`
}
