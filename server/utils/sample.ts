// 目录清单截断：每个分组随机保留固定条数（Fisher-Yates 洗牌后取前 N）
// 落选条目仍可直链访问、也能被检索到；分组总数由调用方另行返回（用于 "+N more"）
export function sampleRandom<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items

  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, limit)
}
