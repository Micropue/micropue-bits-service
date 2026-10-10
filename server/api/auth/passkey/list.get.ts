// 当前账户已绑定的 Passkey 列表（脱敏：不含 publicKey）
export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const passkeys = normalizePasskeys(user.passkeys).map(p => ({
    id: p.id,
    name: p.name ?? '',
    deviceType: p.deviceType ?? 'singleDevice',
    backedUp: !!p.backedUp,
    createdAt: p.createdAt
  }))
  return { passkeys, max: MAX_PASSKEYS }
})
