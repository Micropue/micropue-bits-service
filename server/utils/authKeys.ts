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
  // 敏感操作密码 / TOTP / 恢复码的失败计数与锁定
  passwordFail: (uuid: string) => `auth:password:fail:${uuid}`,
  passwordLock: (uuid: string) => `auth:password:lock:${uuid}`,
  totpFail: (uuid: string) => `auth:totp:fail:${uuid}`,
  totpLock: (uuid: string) => `auth:totp:lock:${uuid}`,
  totpSetupFail: (uuid: string) => `auth:totp:setup:fail:${uuid}`,
  recoveryFail: (uuid: string) => `auth:recovery:fail:${uuid}`,
  recoveryLock: (uuid: string) => `auth:recovery:lock:${uuid}`,
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
  twoFaFail: (ticket: string) => `auth:2fa:fail:${ticket}`,
  // 敏感操作二次验证授权标记（存在即表示最近已通过密码 / 两步验证）
  verifyGrant: (uuid: string) => `auth:verify:grant:${uuid}`,

  // ---------- 后台系统（Bits System Console）：与前台登录完全隔离的键空间 ----------
  // 动态认证码会话（按管理员邮箱，值含码哈希与错码次数）
  consoleCode: (email: string) => `console:code:${email}`,
  // 重发冷却
  consoleCooldown: (email: string) => `console:code:cooldown:${email}`,
  // 每邮箱小时限额
  consoleQuota: (email: string) => `console:code:quota:${email}`,
  // 每 IP 小时限额
  consoleIpQuota: (ip: string) => `console:code:ip:${ip}`,
  // 发码限额：IP × 邮箱 组合
  consolePair: (ip: string, email: string) => `console:code:pair:${ip}:${email}`,
  // 账户级错码计数与临时锁定
  consoleFail: (email: string) => `console:code:fail:${email}`,
  consoleLock: (email: string) => `console:code:lock:${email}`,
  // AuthApp 动态码登录的失败计数与账户锁定
  consoleAppFail: (email: string) => `console:app:fail:${email}`,
  consoleAppLock: (email: string) => `console:app:lock:${email}`,
  // AuthApp 首次绑定动态码的失败计数
  consoleTotpSetupFail: (uuid: string) => `console:totp:setup:fail:${uuid}`,
  // 敏感操作身份确认授权（绑定/解绑 AuthApp、Passkey 前须先验证一次）
  consoleGrant: (uuid: string) => `console:grant:${uuid}`,
  // AuthApp 待激活密钥（绑定流程中，激活前临时存放）
  consoleTotpSetup: (uuid: string) => `console:totp:setup:${uuid}`,
  // AuthApp 动态码已用时间步（防重放）
  consoleTotpStep: (uuid: string) => `console:totp:step:${uuid}`,
  // WebAuthn 注册 challenge（绑定 Passkey）
  consoleWebauthnReg: (uuid: string) => `console:webauthn:reg:${uuid}`,
  // WebAuthn 登录 challenge（不指定用户，随机 challengeId）
  consoleWebauthnAuth: (challengeId: string) => `console:webauthn:auth:${challengeId}`,
  // 高级权限网关码：码哈希与错码次数、重发冷却、验证通过后的 10 分钟授权
  consoleAdvancedCode: (uuid: string) => `console:advanced:code:${uuid}`,
  consoleAdvancedCooldown: (uuid: string) => `console:advanced:cooldown:${uuid}`,
  consoleAdvancedFail: (uuid: string) => `console:advanced:fail:${uuid}`,
  consoleAdvancedGrant: (uuid: string) => `console:advanced:grant:${uuid}`,
  // 高级权限 Passkey 验证 challenge（按管理员）
  consoleAdvancedWebauthn: (uuid: string) => `console:advanced:webauthn:${uuid}`
}
