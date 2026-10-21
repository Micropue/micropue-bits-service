// 简单防抖：run 触发延迟执行，cancel 用于页面卸载或重置
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait = 250) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const run = (...args: Args) => {
    cancel()
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }

  return { run, cancel }
}
