// 用户主页：公开视图 / 作者本人视图
// 访客只看到 public 内容与公开统计；作者本人可看到全部代码段、分组与拆分统计
export default defineEventHandler(async event => {
  setHeader(event, 'cache-control', 'no-store')

  const username = String(getRouterParam(event, 'username') ?? '').trim()
  const [viewer, user] = await Promise.all([getAuthUser(event), findPublicUser(username)])
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const isOwner = viewer?.uuid === user.uuid
  const [snippetPage, groupPage, stats, links, following] = await Promise.all([
    fetchUserSnippets(user.uuid, isOwner, { limit: 12 }),
    fetchUserGroups(user.uuid, isOwner, { limit: 12 }),
    fetchUserStats(user.uuid, isOwner),
    fetchUserLinks(user.uuid),
    isFollowing(viewer?.uuid ?? null, user.uuid)
  ])

  return {
    profile: {
      username: user.username,
      nickname: user.nickname,
      bio: user.bio || '',
      avatarUrl: githubAvatar(user.github_id),
      createdAt: user.created_at,
      isOwner,
      isFollowing: following
    },
    stats,
    links,
    snippets: snippetPage.items,
    snippetTotal: snippetPage.total,
    groups: groupPage.items,
    groupTotal: groupPage.total
  }
})
