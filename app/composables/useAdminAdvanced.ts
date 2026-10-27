// 高级权限前端守卫：删除 / 禁用等操作先确认 10 分钟授权，过期则弹出网关码弹窗
// 授权绝对时间存 state，顶栏倒计时与 API 校验共用，不依赖 setInterval 的准确性
let waiters: ((allowed: boolean) => void)[] = []

export function useAdminAdvanced() {
  const { user } = useAdminAuth()
  const expiresAt = useState<number>('admin-advanced-expires-at', () => 0)
  const visible = useState<boolean>('admin-advanced-dialog', () => false)

  const advanced = computed(() => user.value?.advanced === true)

  function setGrant(seconds: number) {
    expiresAt.value = seconds > 0 ? Date.now() + seconds * 1000 : 0
  }

  // 有高级权限且验证未过期直接放行；否则等待全局弹窗完成验证
  function requireAdvanced(): Promise<boolean> {
    if (!advanced.value) return Promise.resolve(false)
    if (expiresAt.value > Date.now()) return Promise.resolve(true)
    visible.value = true
    return new Promise(resolve => waiters.push(resolve))
  }

  function settleAdvanced(allowed: boolean) {
    visible.value = false
    const pending = waiters
    waiters = []
    for (const resolve of pending) resolve(allowed)
  }

  return { advanced, expiresAt, visible, requireAdvanced, settleAdvanced, setGrant }
}
