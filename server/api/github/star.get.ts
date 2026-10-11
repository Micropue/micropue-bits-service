const OWNER = 'Micropue'
const REPO = 'micropue-bits-service'

// 缓存 1 小时，避免频繁请求 GitHub API 触发限流
export default defineCachedEventHandler(async () => {
    try {
        const repo = await $fetch<{ stargazers_count: number }>(`https://api.github.com/repos/${OWNER}/${REPO}`, {
            headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'micropue-bits'
            }
        })
        return { stars: repo.stargazers_count }
    } catch (err) {
        console.warn('[github] star 获取失败：', err instanceof Error ? err.message : err)
        return { stars: null }
    }
})
