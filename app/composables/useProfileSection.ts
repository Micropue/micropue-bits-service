export interface ProfileSectionProfile {
  username: string
  nickname: string
  bio: string
  avatarUrl: string | null
  createdAt: string
  isOwner: boolean
}

export interface ProfileSectionStats {
  snippets: number
  groups: number
  followers: number
  following: number
  copies: number
  favorites: number
}

export interface ProfileSectionLink {
  label: string
  url: string
}

export interface ProfileSectionData {
  profile: ProfileSectionProfile
  stats: ProfileSectionStats
  links: ProfileSectionLink[]
}

// 个人主页的私有子页面（收藏 / 反馈举报 / 目录申请）：仅本人可访问
export async function requireProfileOwner(username: string): Promise<ProfileSectionData> {
  const { data } = await useFetch<ProfileSectionData>(
    `/api/users/${encodeURIComponent(username)}`,
    { key: `profile-section-owner-${username}` }
  )
  if (!data.value?.profile?.isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }
  return data.value
}
