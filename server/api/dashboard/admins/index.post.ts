import { randomUUID } from 'node:crypto'

// 新增管理员
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  await enforceUserRateLimit(event, admin.uuid, 'admin:admins:create', 5, 3600)
  const body = await readBody<{ email?: string; name?: string }>(event)

  const email = String(body?.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a valid email address', data: { field: 'email' } })
  }
  const name = String(body?.name ?? '').trim().slice(0, 64)

  if (await fetchAdminByEmail(email)) {
    throw createError({ statusCode: 409, statusMessage: 'This email is already an administrator', data: { field: 'email' } })
  }

  const uuid = randomUUID()
  try {
    await useDb().execute(
      'INSERT INTO `admins` (`uuid`,`email`,`name`) VALUES (?, ?, ?)',
      [uuid, email, name]
    )
  } catch (err) {
    // 并发竞态：同一邮箱已被其他请求加入
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, statusMessage: 'This email is already an administrator', data: { field: 'email' } })
    }
    throw err
  }

  return { admin: publicAdminOrNull(await fetchAdminByUuid(uuid)) }
})
