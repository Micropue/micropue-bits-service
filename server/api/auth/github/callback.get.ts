import { randomUUID } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'

// GitHub OAuth 回调：login = 登录/注册；link = 绑定当前账户
export default defineEventHandler(async event => {
  const query = getQuery(event)
  const code = String(query.code ?? '')
  const state = String(query.state ?? '')

  const redis = useRedis()
  const raw = state ? await redis.get(AUTH_KEYS.githubState(state)) : null
  if (!raw) {
    return sendRedirect(event, `/sign?github_error=${encodeURIComponent('This GitHub authorization has expired. Please try again.')}`)
  }
  await redis.del(AUTH_KEYS.githubState(state))
  const { mode, uuid } = JSON.parse(raw) as { mode: 'login' | 'link'; uuid?: string }

  const errorBase = mode === 'link' ? '/account/security' : '/sign'
  const fail = (msg: string) => sendRedirect(event, `${errorBase}?github_error=${encodeURIComponent(msg)}`)

  if (!code) return fail('GitHub authorization was cancelled.')

  try {
    const token = await exchangeGithubCode(code, githubRedirectUri(event))
    const profile = await fetchGithubProfile(token)
    const githubId = String(profile.id)
    const db = useDb()

    if (mode === 'link') {
      const user = await getAuthUser(event)
      if (!user || user.uuid !== uuid) return fail('Your session has expired. Please sign in again.')
      if (user.github_id) return fail('A GitHub account is already linked.')
      const [taken] = await db.query<RowDataPacket[]>(
        'SELECT `uuid` FROM `users` WHERE `github_id` = ? LIMIT 1',
        [githubId]
      )
      if (taken.length > 0) return fail('This GitHub account is already linked to another account.')
      try {
        await db.execute('UPDATE `users` SET `github_id` = ?, `github_login` = ? WHERE `uuid` = ?', [
          githubId,
          profile.login,
          user.uuid
        ])
      } catch (err) {
        if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
          return fail('This GitHub account is already linked to another account.')
        }
        throw err
      }
      return sendRedirect(event, '/account/security?github_linked=1')
    }

    // login 模式：按 github_id 查找；未注册则创建账户
    const [rows] = await db.query<
      (RowDataPacket & {
        uuid: string
        email: string
        nickname: string
        status: string
        login_devices: unknown
        totp_secret: string | null
        two_factor_enabled: number
        passkeys: unknown
      })[]
    >(
      'SELECT `uuid`, `email`, `nickname`, `status`, `login_devices`, `totp_secret`, `two_factor_enabled`, `passkeys` FROM `users` WHERE `github_id` = ? LIMIT 1',
      [githubId]
    )
    let user = rows[0]
    let isNew = false

    if (user) {
      if (user.status !== 'normal') return fail('This account has been disabled.')
      // 刷新一次 GitHub 用户名，保证展示最新
      await db.execute('UPDATE `users` SET `github_login` = ? WHERE `uuid` = ?', [profile.login, user.uuid])
    } else {
      if (!profile.email) return fail('Your GitHub account has no verified email address.')
      const [exists] = await db.query<RowDataPacket[]>('SELECT `uuid` FROM `users` WHERE `email` = ? LIMIT 1', [
        profile.email
      ])
      if (exists.length > 0) {
        return fail('An account with this email already exists. Sign in with that email, then link GitHub.')
      }
      isNew = true
      const newUuid = randomUUID()
      const nickname = `user_${newUuid.replace(/-/g, '').slice(0, 8)}`
      try {
        await db.execute(
          'INSERT INTO `users` (`uuid`, `email`, `username`, `email_verified_at`, `nickname`, `password_hash`, `github_id`, `github_login`) VALUES (?, ?, ?, NOW(), ?, NULL, ?, ?)',
          [newUuid, profile.email, profile.email, nickname, githubId, profile.login]
        )
      } catch (err) {
        if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err
      }
      const [again] = await db.query<
        (RowDataPacket & {
          uuid: string
          email: string
          nickname: string
          status: string
          login_devices: unknown
          totp_secret: string | null
          two_factor_enabled: number
          passkeys: unknown
        })[]
      >(
        'SELECT `uuid`, `email`, `nickname`, `status`, `login_devices`, `totp_secret`, `two_factor_enabled`, `passkeys` FROM `users` WHERE `github_id` = ? LIMIT 1',
        [githubId]
      )
      user = again[0]
      if (!user) return fail('Failed to create account.')
    }

    // 两步验证：已开启则跳回 /sign 进入第二因子步骤，否则直接签发会话
    const result = await beginSessionOrTwoFactor(event, user)
    if (result.requires2fa) {
      return sendRedirect(event, `/sign?twofa=${encodeURIComponent(result.ticket)}`)
    }
    // 新注册的 GitHub 账户无密码，引导去设置密码
    return sendRedirect(event, isNew ? '/account/security?github_new=1' : '/account')
  } catch (err) {
    console.error('[github] OAuth 回调失败：', err)
    // 开发环境回带具体原因（如 redirect_uri_mismatch / bad_verification_code），便于定位
    const detail = (err as { statusMessage?: string })?.statusMessage
    const msg = process.env.NODE_ENV !== 'production' && detail ? detail : 'GitHub sign-in failed. Please try again.'
    return fail(msg)
  }
})
