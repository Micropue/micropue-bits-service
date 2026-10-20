// 重置第二因子（用户丢失设备时的救援）：scope = app（AuthApp + 恢复码）或 passkeys（全部通行密钥）
// 不会锁死账号：邮箱验证码始终可用；若移除后已无任何第二因子，同时关闭 two_factor_enabled
export default defineEventHandler(async event => {
  await requireAdmin(event)

  const uuid = String(getRouterParam(event, 'uuid') ?? '')
  const body = await readBody<{ scope?: string }>(event)
  const scope = String(body?.scope ?? '')

  const user = await fetchUserRow(uuid)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const db = useDb()
  if (scope === 'app') {
    await db.execute(
      `UPDATE \`users\`
          SET \`totp_secret\` = NULL, \`recovery_codes\` = JSON_ARRAY(),
              \`two_factor_enabled\` = IF(JSON_LENGTH(\`passkeys\`) > 0, \`two_factor_enabled\`, 0)
        WHERE \`uuid\` = ?`,
      [uuid]
    )
  } else if (scope === 'passkeys') {
    await db.execute(
      `UPDATE \`users\`
          SET \`passkeys\` = JSON_ARRAY(),
              \`two_factor_enabled\` = IF(\`totp_secret\` IS NULL, 0, \`two_factor_enabled\`),
              \`recovery_codes\` = IF(\`totp_secret\` IS NULL, JSON_ARRAY(), \`recovery_codes\`)
        WHERE \`uuid\` = ?`,
      [uuid]
    )
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Unknown scope', data: { field: 'scope' } })
  }

  const updated = await fetchUserRow(uuid)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { user: publicUserSummary(updated) }
})
