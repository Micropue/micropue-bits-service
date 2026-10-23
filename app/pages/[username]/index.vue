<template>
  <template v-if="tab === 'favorites'">
    <AccountFavoritesPanel />
  </template>
  <template v-else-if="tab === 'feedback' || tab === 'reports'">
    <AccountFeedbackPanel />
  </template>
  <template v-else-if="tab === 'requests'">
    <AccountRequestsPanel />
  </template>
  <div v-else class="profile-content">
        <section class="content-section" aria-labelledby="snippets-title">
          <header class="section-head">
            <h2 id="snippets-title" class="section-title">
              Snippets
              <span class="section-count">{{ snippetTotal }}</span>
            </h2>
            <div class="section-tools">
              <Button v-if="profile.isOwner && !snippetQuery.trim() && snippetItems.length" label="Reorder" size="small"
                severity="secondary" text @click="openOrder('snippet')" />
              <InputText v-if="snippetTotal || snippetQuery || profile.isOwner" v-model="snippetQuery" class="section-search"
                name="profile-snippet-search" size="small" autocomplete="off" placeholder="Search snippets"
                aria-label="Search snippets" />
            </div>
          </header>

          <p v-if="!snippetItems.length" class="empty">
            <template v-if="snippetQuery.trim()">No snippets match this search.</template>
            <template v-else>{{ profile.isOwner ? 'No snippets yet.' : 'No public snippets yet.' }}</template>
          </p>

          <div v-else class="snippet-grid">
            <article v-for="snippet in snippetItems" :key="snippet.slug" class="snippet-card">
              <NuxtLink :to="`/${profile.username}/${snippet.slug}`" class="snippet-link">
                <div class="snippet-card-head">
                  <span class="snippet-lang">
                    <img v-if="snippet.language?.logo_url" class="lang-logo" :src="snippet.language.logo_url" alt=""
                      width="14" height="14" loading="lazy">
                    {{ snippet.language?.name ?? 'Snippet' }}
                  </span>
                  <span class="snippet-date">{{ formatDate(snippet.updated_at) }}</span>
                </div>
                <h3 class="snippet-name">{{ snippet.name }}</h3>
                <p v-if="snippet.intro" class="snippet-intro">{{ snippet.intro }}</p>
                <div class="snippet-tags">
                  <span v-if="snippet.pinned" class="tag tag--pinned">Pinned</span>
                  <span v-if="profile.isOwner" class="tag" :class="`tag--${snippet.visibility}`">
                    {{ visibilityLabel(snippet.visibility) }}
                  </span>
                  <span v-for="tag in snippet.tags" :key="tag.key" class="tag">{{ tag.name }}</span>
                </div>
                <div class="card-traffic">
                  <span :title="`Copies: ${snippet.copyCount}`"><Copy aria-hidden="true" />{{ snippet.copyCount }}</span>
                  <span :title="`Forks: ${snippet.forkCount}`"><CodeBranch aria-hidden="true" />{{ snippet.forkCount }}</span>
                  <span :title="`Favorites: ${snippet.favoriteCount}`"><Bookmark aria-hidden="true" />{{ snippet.favoriteCount }}</span>
                </div>
              </NuxtLink>
              <div v-if="profile.isOwner" class="card-actions">
                <Button :label="snippet.pinned ? 'Unpin' : 'Pin'" size="small" text severity="secondary"
                  :loading="pinBusy === snippet.slug" @click="togglePin('snippet', snippet)" />
                <Button label="Edit" size="small" text severity="secondary"
                  @click="navigateTo(`/${profile.username}/${snippet.slug}/edit`)" />
                <Button label="Delete" size="small" text severity="danger" @click="askDeleteSnippet(snippet)" />
              </div>
            </article>
          </div>

          <div v-if="snippetItems.length < snippetTotal" class="section-more">
            <Button label="Load more" size="small" severity="secondary" outlined :loading="snippetLoading"
              @click="loadSnippets(false)" />
          </div>
        </section>

        <section id="groups" class="content-section" aria-labelledby="groups-title">
          <header class="section-head">
            <h2 id="groups-title" class="section-title">
              Groups
              <span class="section-count">{{ groupTotal }}</span>
            </h2>
            <div class="section-tools">
              <Button v-if="profile.isOwner && !groupQuery.trim() && groupItems.length" label="Reorder" size="small"
                severity="secondary" text @click="openOrder('group')" />
              <InputText v-if="groupTotal || groupQuery || profile.isOwner" v-model="groupQuery" class="section-search"
                name="profile-group-search" size="small" autocomplete="off" placeholder="Search groups"
                aria-label="Search groups" />
            </div>
          </header>

          <p v-if="!groupItems.length" class="empty">
            <template v-if="groupQuery.trim()">No groups match this search.</template>
            <template v-else>{{ profile.isOwner ? 'No groups yet — create one to organize snippets.' : 'No public groups yet.' }}</template>
          </p>

          <div v-else class="group-grid">
            <article v-for="group in groupItems" :key="group.slug" class="group-card">
              <NuxtLink :to="`/${profile.username}/${group.slug}`" class="group-link">
                <div class="group-head">
                  <span class="group-title">
                    <FolderIcon aria-hidden="true" />
                    {{ group.name }}
                  </span>
                  <span class="group-count">{{ plural(group.snippetCount, 'snippet') }}</span>
                </div>
                <p v-if="group.intro" class="group-intro">{{ group.intro }}</p>
                <div class="snippet-tags">
                  <span v-if="group.pinned" class="tag tag--pinned">Pinned</span>
                  <span v-if="profile.isOwner" class="tag" :class="`tag--${group.visibility}`">
                    {{ visibilityLabel(group.visibility) }}
                  </span>
                  <span v-for="tag in group.tags" :key="tag.key" class="tag">{{ tag.name }}</span>
                </div>
                <div class="card-traffic">
                  <span :title="`Snippets: ${group.snippetCount}`"><FolderIcon aria-hidden="true" />{{ group.snippetCount }}</span>
                  <span :title="`Forks: ${group.forkCount}`"><CodeBranch aria-hidden="true" />{{ group.forkCount }}</span>
                  <span :title="`Favorites: ${group.favoriteCount}`"><Bookmark aria-hidden="true" />{{ group.favoriteCount }}</span>
                </div>
              </NuxtLink>
              <div v-if="profile.isOwner" class="card-actions">
                <Button :label="group.pinned ? 'Unpin' : 'Pin'" size="small" text severity="secondary"
                  :loading="pinBusy === group.slug" @click="togglePin('group', group)" />
                <Button label="Edit" size="small" text severity="secondary" @click="openGroupEdit(group)" />
                <Button label="Delete" size="small" text severity="danger" @click="askDeleteGroup(group)" />
              </div>
            </article>
          </div>

          <div v-if="groupItems.length < groupTotal" class="section-more">
            <Button label="Load more" size="small" severity="secondary" outlined :loading="groupLoading"
              @click="loadGroups(false)" />
          </div>
        </section>
  </div>

  <GroupDialog v-model:visible="groupDialogVisible" :group="groupForEdit" @saved="reloadProfile" />

  <ProfileOrderDialog v-if="profile?.isOwner" v-model:visible="orderDialog" :kind="orderKind"
    @saved="reloadProfile" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'profile',
  middleware: 'profile-tab',
  // 切换用户名时强制重新挂载，避免右侧列表沿用一个用户的数据
  key: route => route.path
})

import LinkIcon from '@primeicons/vue/link'
import AccountFavoritesPanel from '../account/favorites.vue'
import AccountFeedbackPanel from '../account/activity.vue'
import AccountRequestsPanel from '../account/requests.vue'
import FolderIcon from '@primeicons/vue/folder'
import Bookmark from '@primeicons/vue/bookmark'
import CodeBranch from '@primeicons/vue/code-branch'
import Copy from '@primeicons/vue/copy'

// 用户主页 /{username}：公开视图 + 作者本人管理视图
interface Profile {
  username: string
  nickname: string
  bio: string
  avatarUrl: string | null
  createdAt: string
  isOwner: boolean
  isFollowing: boolean
}

interface TagItem {
  key: string
  name: string
}

interface SnippetItem {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  updated_at: string
  group_sid: string | null
  pinned: boolean
  favoriteCount: number
  copyCount: number
  forkCount: number
  language: { slug: string, name: string, logo_url: string | null } | null
  tags: TagItem[]
}

interface GroupItem {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: string
  updated_at: string
  pinned: boolean
  favoriteCount: number
  forkCount: number
  snippetCount: number
  tags: TagItem[]
}

interface Stats {
  snippets: number
  groups: number
  copies: number
  favorites: number
  followers: number
  following: number
  breakdown?: { public: number, unlisted: number, private: number }
}

interface LinkItem {
  platform: string
  label: string
  url: string
}

const VISIBILITY_OPTIONS = [
  { label: 'Private', value: 'private' },
  { label: 'Unlisted', value: 'unlisted' },
  { label: 'Public', value: 'public' }
]

const route = useRoute()
const username = String(route.params.username ?? '')
type ProfileTab = 'profile' | 'favorites' | 'feedback' | 'reports' | 'requests'
const tab = computed<ProfileTab>(() => {
  const value = String(route.query.tab ?? '')
  return value === 'favorites' || value === 'feedback' || value === 'reports' || value === 'requests'
    ? value
    : 'profile'
})
const { user: authUser } = useAuthUser()
const toast = useToast()
const confirm = useConfirm()

const { data, pending, error, refresh } = await useFetch<{
  profile: Profile
  stats: Stats
  links: LinkItem[]
  snippets: SnippetItem[]
  snippetTotal: number
  groups: GroupItem[]
  groupTotal: number
}>(`/api/users/${encodeURIComponent(username)}`, { key: `public-profile-${username}` })

const profile = computed(() => data.value?.profile ?? null)
const stats = computed(() => data.value?.stats ?? null)
const links = computed(() => data.value?.links ?? [])

// 列表本地状态：首屏来自主页接口，之后各自独立搜索 / 懒加载
const snippetItems = ref<SnippetItem[]>([])
const snippetTotal = ref(0)
const snippetQuery = ref('')
const snippetLoading = ref(false)
const groupItems = ref<GroupItem[]>([])
const groupTotal = ref(0)
const groupQuery = ref('')
const groupLoading = ref(false)

function syncLists() {
  snippetItems.value = data.value?.snippets ?? []
  snippetTotal.value = data.value?.snippetTotal ?? 0
  groupItems.value = data.value?.groups ?? []
  groupTotal.value = data.value?.groupTotal ?? 0
}
syncLists()

// 用户不存在 / 未设置用户名：返回真正的 404 页面
if (error.value || !data.value?.profile) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${unit(count, singular, pluralForm)}`
}

function unit(count: number, singular: string, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

// ---------- 列表搜索 / 懒加载 ----------
let snippetSeq = 0
let groupSeq = 0

async function loadSnippets(reset: boolean) {
  const seq = ++snippetSeq
  const offset = reset ? 0 : snippetItems.value.length
  snippetLoading.value = true
  try {
    const response = await $fetch<{ items: SnippetItem[], total: number }>('/api/profile/snippets', {
      query: { username, q: snippetQuery.value.trim(), limit: 12, offset }
    })
    if (seq !== snippetSeq) return
    snippetItems.value = reset ? response.items : [...snippetItems.value, ...response.items]
    snippetTotal.value = response.total
  } catch {
    if (seq === snippetSeq && reset) {
      snippetItems.value = []
      snippetTotal.value = 0
    }
  } finally {
    if (seq === snippetSeq) snippetLoading.value = false
  }
}

async function loadGroups(reset: boolean) {
  const seq = ++groupSeq
  const offset = reset ? 0 : groupItems.value.length
  groupLoading.value = true
  try {
    const response = await $fetch<{ items: GroupItem[], total: number }>('/api/profile/groups', {
      query: { username, q: groupQuery.value.trim(), limit: 12, offset }
    })
    if (seq !== groupSeq) return
    groupItems.value = reset ? response.items : [...groupItems.value, ...response.items]
    groupTotal.value = response.total
  } catch {
    if (seq === groupSeq && reset) {
      groupItems.value = []
      groupTotal.value = 0
    }
  } finally {
    if (seq === groupSeq) groupLoading.value = false
  }
}

const snippetSearch = debounce(() => { void loadSnippets(true) }, 250)
const groupSearch = debounce(() => { void loadGroups(true) }, 250)
watch(snippetQuery, () => snippetSearch.run())
watch(groupQuery, () => groupSearch.run())

// 删除 / 新建分组后：统计与列表一起刷新
async function reloadProfile() {
  await Promise.all([refresh(), loadSnippets(true), loadGroups(true)])
}

const contentRefresh = useState('profile-content-refresh', () => 0)
watch(contentRefresh, () => { void reloadProfile() })

function visibilityLabel(value: string) {
  return VISIBILITY_OPTIONS.find(option => option.value === value)?.label ?? value
}

// ---------- 关注 ----------
const followBusy = ref(false)

async function toggleFollow() {
  if (!profile.value || followBusy.value) return
  followBusy.value = true
  try {
    if (profile.value.isFollowing) {
      await $fetch(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' })
      toast.add({ severity: 'success', summary: `Unfollowed @${username}`, life: 2500 })
    } else {
      await $fetch(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'POST' })
      toast.add({ severity: 'success', summary: `Following @${username}`, life: 2500 })
    }
    await refresh()
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    toast.add({ severity: 'error', summary: e.statusMessage ?? 'Action failed', life: 4000 })
  } finally {
    followBusy.value = false
  }
}

// ---------- 置顶 / 拖拽排序 ----------
const pinBusy = ref('')
const orderDialog = ref(false)
const orderKind = ref<'snippet' | 'group'>('snippet')

async function togglePin(kind: 'snippet' | 'group', item: { slug: string, pinned: boolean }) {
  if (!profile.value?.isOwner || pinBusy.value) return
  pinBusy.value = item.slug
  try {
    const response = await $fetch<{ pinned: boolean }>('/api/profile/pin', {
      method: 'PATCH',
      body: { kind, slug: item.slug, pinned: !item.pinned }
    })
    toast.add({
      severity: 'success',
      summary: response.pinned ? 'Pinned to profile' : 'Unpinned',
      life: 2500
    })
    await reloadProfile()
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Action failed', life: 4000 })
  } finally {
    pinBusy.value = ''
  }
}

function openOrder(kind: 'snippet' | 'group') {
  orderKind.value = kind
  orderDialog.value = true
}

// ---------- 举报用户 ----------
const reportUserDialog = ref(false)

async function openReportUser() {
  if (!authUser.value) {
    await navigateTo('/sign')
    return
  }
  reportUserDialog.value = true
}

// ---------- 删除代码段 / 分组 ----------
function askDeleteSnippet(snippet: SnippetItem) {
  confirm.require({
    header: 'Delete snippet',
    message: `Delete “${snippet.name}”? The public link will stop working.`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await $fetch(`/api/contents/${encodeURIComponent(snippet.slug)}`, { method: 'DELETE' })
        await reloadProfile()
        toast.add({ severity: 'success', summary: 'Snippet deleted', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Delete failed', life: 4000 })
      }
    }
  })
}

function askDeleteGroup(group: GroupItem) {
  confirm.require({
    header: 'Delete group',
    message: `Delete “${group.name}”? Snippets inside stay, but are no longer grouped.`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await $fetch(`/api/groups/${encodeURIComponent(group.slug)}`, { method: 'DELETE' })
        await reloadProfile()
        toast.add({ severity: 'success', summary: 'Group deleted', life: 2500 })
      } catch (err) {
        toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Delete failed', life: 4000 })
      }
    }
  })
}

// ---------- 分组新建 / 编辑（弹窗组件） ----------
const groupDialogVisible = ref(false)
const groupForEdit = ref<GroupItem | null>(null)

function openGroupCreate() {
  groupForEdit.value = null
  groupDialogVisible.value = true
}

function openGroupEdit(group: GroupItem) {
  groupForEdit.value = group
  groupDialogVisible.value = true
}

// ---------- 开放链接 ----------
const linksDialog = ref(false)
const linksSaving = ref(false)
const linksError = ref('')
const linkDraft = ref<{ label: string, url: string }[]>([])

function openLinks() {
  linkDraft.value = links.value.map(link => ({ label: link.label, url: link.url }))
  if (!linkDraft.value.length) linkDraft.value = [{ label: '', url: '' }]
  linksError.value = ''
  linksDialog.value = true
}

function addLinkRow() {
  if (linkDraft.value.length < 6) linkDraft.value.push({ label: '', url: '' })
}

async function saveLinks() {
  if (linksSaving.value) return
  linksSaving.value = true
  linksError.value = ''
  try {
    const cleaned = linkDraft.value
      .map(link => ({ label: link.label.trim(), url: link.url.trim() }))
      .filter(link => link.label && link.url)
    await $fetch('/api/account/links', { method: 'PUT', body: { links: cleaned } })
    linksDialog.value = false
    await refresh()
    toast.add({ severity: 'success', summary: 'Links updated', life: 2500 })
  } catch (err) {
    linksError.value = (err as { statusMessage?: string }).statusMessage ?? 'Save failed'
  } finally {
    linksSaving.value = false
  }
}

// ---------- 粉丝 / 关注列表 ----------
type FollowList = 'followers' | 'following'

interface FollowPerson {
  sid: string
  username: string | null
  nickname: string
  avatarUrl: string | null
}

const followDialog = ref(false)
const followList = ref<FollowList>('followers')
const followItems = ref<FollowPerson[]>([])
const followTotal = ref(0)
const followQuery = ref('')
const followLoading = ref(false)
const followCanManage = ref(false)
let followSeq = 0

const followDialogTitle = computed(() =>
  `${followList.value === 'followers' ? 'Followers' : 'Following'} · @${username}`
)

async function loadFollows(reset: boolean) {
  if (!followDialog.value) return
  const seq = ++followSeq
  const offset = reset ? 0 : followItems.value.length
  followLoading.value = true
  try {
    const response = await $fetch<{ items: FollowPerson[], total: number, isOwner: boolean }>('/api/follows', {
      query: { username, list: followList.value, q: followQuery.value.trim(), limit: 20, offset }
    })
    if (seq !== followSeq) return
    followItems.value = reset ? response.items : [...followItems.value, ...response.items]
    followTotal.value = response.total
    followCanManage.value = response.isOwner
  } catch {
    if (seq === followSeq && reset) {
      followItems.value = []
      followTotal.value = 0
    }
  } finally {
    if (seq === followSeq) followLoading.value = false
  }
}

const followSearch = debounce(() => { void loadFollows(true) }, 250)
watch(followQuery, () => followSearch.run())

function openFollowDialog(list: FollowList) {
  followList.value = list
  followQuery.value = ''
  followItems.value = []
  followTotal.value = 0
  followCanManage.value = false
  followDialog.value = true
  void loadFollows(true)
}

// 指令框 /followers、/following：主页加载完成后直接打开对应弹窗
function openFollowDialogFromQuery() {
  if (!profile.value?.isOwner) return
  const dialog = String(route.query.dialog ?? '')
  if (dialog !== 'followers' && dialog !== 'following') return
  openFollowDialog(dialog)
}

// 用户关闭弹窗后再清掉 query，避免刷新时重复打开；打开时保留 query 供命令复用
function onFollowDialogVisibility(open: boolean) {
  if (open || !route.query.dialog) return
  const query = { ...route.query }
  delete query.dialog
  void navigateTo({ path: route.path, query }, { replace: true })
}

function switchFollowList(list: FollowList) {
  if (followList.value === list) return
  followList.value = list
  followQuery.value = ''
  followItems.value = []
  followTotal.value = 0
  void loadFollows(true)
}

function removeFollow(person: FollowPerson) {
  const removingFollower = followList.value === 'followers'
  confirm.require({
    header: removingFollower ? 'Remove follower' : 'Unfollow user',
    message: removingFollower
      ? `Remove ${person.nickname} from your followers?`
      : `Unfollow ${person.nickname}?`,
    acceptLabel: removingFollower ? 'Remove' : 'Unfollow',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await $fetch('/api/follows', { method: 'DELETE', query: { sid: person.sid } })
        followItems.value = followItems.value.filter(item => item.sid !== person.sid)
        followTotal.value = Math.max(0, followTotal.value - 1)
        await refresh()
        toast.add({
          severity: 'success',
          summary: removingFollower ? 'Follower removed' : 'Unfollowed',
          life: 2500
        })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: (err as { statusMessage?: string }).statusMessage ?? 'Action failed',
          life: 4000
        })
      }
    }
  })
}

onBeforeUnmount(() => {
  snippetSearch.cancel()
  groupSearch.cancel()
  followSearch.cancel()
})

useHead({
  title: () => (profile.value ? `${profile.value.nickname} (@${profile.value.username})` : 'User'),
  meta: [{ name: 'description', content: () => profile.value?.bio || 'Public snippets shared on Bits.' }]
})
</script>

<style scoped lang="scss">
.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
}

.public-page {
  width: min(1200px, 94vw);
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

/* ---------- 左：资料卡 ---------- */
.profile-card {
  position: sticky;
  top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-content-background);
}

.profile-name {
  margin: 0.4rem 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.profile-handle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.profile-bio {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
  white-space: pre-line;
}

.profile-meta {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.profile-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.2rem;
}

.profile-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  color: inherit;
  font-size: 0.78rem;
  text-decoration: none;

  &:hover {
    border-color: color-mix(in srgb, var(--p-text-color) 30%, var(--p-content-border-color));
  }

  svg {
    width: 0.8rem;
    height: 0.8rem;
    opacity: 0.7;
  }
}

.profile-stats {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  margin: 0.9rem 0 0;
  padding-top: 0.9rem;
  border-top: 1px solid var(--p-content-border-color);
}

/* 统计分组：内容 / 社区 / 流量，避免六项数字并排、没有重心 */
.stat-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-group-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.stat-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.6rem;
}

.stat-value {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;

  strong {
    margin-right: 0.28rem;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--p-text-color);
    font-variant-numeric: tabular-nums;
  }
}

.stat-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover strong {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.profile-breakdown {
  margin: 0;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.6rem;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.action-manage {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  margin-top: 0.15rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--p-content-border-color);
}

/* ---------- 右：内容区 ---------- */
.profile-main {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
  min-width: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.section-search {
  width: 17rem;
  max-width: 45vw;
}

.section-more {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.section-count {
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--p-text-color) 8%, transparent);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.empty {
  margin: 0;
  padding: 1.5rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 1rem;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.snippet-grid,
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.snippet-card,
.group-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.9rem;
  background: var(--p-content-background);
  overflow: hidden;
}

.snippet-link,
.group-link {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  padding: 1.1rem 1.15rem;
  color: inherit;
  text-decoration: none;

  &:hover .snippet-name,
  &:hover .group-title {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.snippet-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.snippet-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.lang-logo {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: var(--logo-tint);
}

.snippet-date {
  flex-shrink: 0;
}

.snippet-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.snippet-intro {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.group-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.98rem;
  font-weight: 600;
  min-width: 0;

  svg {
    flex-shrink: 0;
    width: 0.95rem;
    height: 0.95rem;
    opacity: 0.6;
  }
}

.group-count {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.group-intro {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.snippet-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.3rem;
}

.card-traffic {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.3rem;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  svg {
    width: 0.85rem;
    height: 0.85rem;
    opacity: 0.65;
  }
}

.tag {
  padding: 0.08rem 0.45rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);

  &--public {
    border-color: color-mix(in srgb, #16a34a 45%, var(--p-content-border-color));
    color: color-mix(in srgb, #16a34a 75%, var(--p-text-color));
  }

  &--unlisted {
    border-color: color-mix(in srgb, #d97706 45%, var(--p-content-border-color));
    color: color-mix(in srgb, #d97706 75%, var(--p-text-color));
  }

  &--private {
    border-color: color-mix(in srgb, #dc2626 40%, var(--p-content-border-color));
    color: color-mix(in srgb, #dc2626 70%, var(--p-text-color));
  }

  &--pinned {
    border-color: color-mix(in srgb, #2563eb 45%, var(--p-content-border-color));
    color: color-mix(in srgb, #2563eb 75%, var(--p-text-color));
  }
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.15rem;
  padding: 0.3rem 0.7rem;
  border-top: 1px solid var(--p-content-border-color);
  background: color-mix(in srgb, var(--p-text-color) 2%, transparent);
}

/* ---------- 弹窗 ---------- */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialog-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.optional {
  opacity: 0.7;
}

.tag-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  :deep(.p-inputtext) {
    flex: 1 1 auto;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag-remove {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: 1;
  opacity: 0.6;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
}

.link-row {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.link-remove {
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 50%;
  background: none;
  color: var(--p-text-muted-color);
  font: inherit;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: var(--p-text-color);
    border-color: var(--p-text-color);
  }
}

.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-red-500, #ef4444);
}

/* ---------- 粉丝 / 关注弹窗 ---------- */
.follow-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.follow-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.follow-tab {
  padding: 0.45rem 0.7rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--p-text-muted-color);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;

  span {
    margin-left: 0.3rem;
    font-size: 0.72rem;
    opacity: 0.75;
  }

  &.is-active {
    border-bottom-color: var(--p-text-color);
    color: var(--p-text-color);
    font-weight: 600;
  }
}

.follow-state {
  margin: 0;
  padding: 1rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 0.75rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.follow-list {
  display: flex;
  flex-direction: column;
  max-height: 22rem;
  overflow-y: auto;
}

.follow-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.25rem;
  border-bottom: 1px solid var(--p-content-border-color);

  &:last-child {
    border-bottom: 0;
  }
}

.follow-person {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;

  &:hover .follow-name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.follow-person-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.follow-name {
  overflow: hidden;
  font-size: 0.88rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.follow-handle {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.follow-more {
  display: flex;
  justify-content: center;
}

/* ---------- 状态 ---------- */
.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 4rem 1.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  text-align: center;
}

.state-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.state-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.inline-link {
  color: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-card {
    position: static;
  }
}

@media (max-width: 700px) {
  .section-head {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }

  .section-tools {
    justify-content: space-between;
  }

  .section-search {
    width: 100%;
    max-width: none;
  }
}
</style>
