<template>
  <aside class="profile-card" :aria-busy="!profile">
    <template v-if="profile">
    <UserAvatar :src="profile.avatarUrl" :size="72" />
    <h1 class="profile-name">{{ profile.nickname }}</h1>
    <p class="profile-handle">@{{ profile.username }}</p>
    <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>
    <p class="profile-meta">Joined {{ formatDate(profile.createdAt) }}</p>

    <div v-if="links.length" class="profile-links">
      <a v-for="link in links" :key="link.label + link.url" class="profile-link" :href="link.url" target="_blank"
        rel="noopener noreferrer">
        <LinkIcon aria-hidden="true" />
        <span>{{ link.label }}</span>
      </a>
    </div>

    <div class="profile-stats">
      <div class="stat-group">
        <span class="stat-group-label">Content</span>
        <div class="stat-values">
          <span class="stat-value"><strong>{{ stats?.snippets ?? 0 }}</strong>{{ unit(stats?.snippets ?? 0, 'snippet') }}</span>
          <span class="stat-value"><strong>{{ stats?.groups ?? 0 }}</strong>{{ unit(stats?.groups ?? 0, 'group') }}</span>
        </div>
      </div>
      <div class="stat-group">
        <span class="stat-group-label">Community</span>
        <div class="stat-values">
          <button type="button" class="stat-value stat-button" @click="openFollowDialog('followers')">
            <strong>{{ stats?.followers ?? 0 }}</strong>{{ unit(stats?.followers ?? 0, 'follower') }}
          </button>
          <button type="button" class="stat-value stat-button" @click="openFollowDialog('following')">
            <strong>{{ stats?.following ?? 0 }}</strong>{{ unit(stats?.following ?? 0, 'following', 'following') }}
          </button>
        </div>
      </div>
      <div class="stat-group">
        <span class="stat-group-label">Traffic</span>
        <div class="stat-values">
          <span class="stat-value"><strong>{{ stats?.copies ?? 0 }}</strong>{{ unit(stats?.copies ?? 0, 'copy', 'copies') }}</span>
          <span class="stat-value"><strong>{{ stats?.favorites ?? 0 }}</strong>{{ unit(stats?.favorites ?? 0, 'favorite') }}</span>
        </div>
      </div>
    </div>

    <p v-if="profile.isOwner && stats?.breakdown" class="profile-breakdown">
      Public {{ stats.breakdown.public }} · Unlisted {{ stats.breakdown.unlisted }} · Private {{ stats.breakdown.private }}
    </p>

    <div class="profile-actions">
      <template v-if="profile.isOwner">
        <div class="action-grid">
          <Button label="New snippet" size="small" fluid @click="navigateTo('/new')" />
          <Button label="New group" size="small" severity="secondary" outlined fluid @click="openGroupCreate" />
        </div>
        <div class="action-manage">
          <Button label="Edit profile" size="small" text fluid @click="navigateTo('/account/profile')" />
          <Button label="Links" size="small" text fluid @click="openLinks" />
        </div>
      </template>
      <template v-else>
        <Button v-if="authUser" :label="profile.isFollowing ? 'Following' : 'Follow'"
          :severity="profile.isFollowing ? 'secondary' : undefined" :outlined="profile.isFollowing" size="small"
          :loading="followBusy" @click="toggleFollow" />
        <Button v-else label="Follow" size="small" @click="navigateTo('/sign')" />
        <Button label="Report" size="small" text severity="secondary" @click="openReportUser" />
      </template>
    </div>
    </template>
    <div v-else class="profile-loading">
      <ProgressSpinner aria-label="Loading profile" />
    </div>
  </aside>

  <GroupDialog v-model:visible="groupDialogVisible" :group="null" @saved="onGroupSaved" />

  <Dialog v-model:visible="linksDialog" modal :draggable="false" :style="{ width: '34rem' }" header="Open links">
    <div class="dialog-form">
      <p class="dialog-hint">Up to 6 links, http(s) only.</p>
      <div v-for="(link, index) in linkDraft" :key="index" class="link-row">
        <InputText v-model="link.label" :name="`link-label-${index}`" maxlength="32" placeholder="Label" fluid />
        <InputText v-model="link.url" :name="`link-url-${index}`" maxlength="512" placeholder="https://…" fluid />
        <button type="button" class="link-remove" :aria-label="`Remove link ${link.label || index + 1}`"
          @click="linkDraft.splice(index, 1)">×</button>
      </div>
      <Button v-if="linkDraft.length < 6" label="Add link" severity="secondary" text size="small" @click="addLinkRow" />
      <p v-if="linksError" class="form-error" role="alert">{{ linksError }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="linksDialog = false" />
      <Button label="Save" :loading="linksSaving" @click="saveLinks" />
    </template>
  </Dialog>

  <Dialog v-model:visible="followDialog" modal :draggable="false" :style="{ width: '32rem' }" :header="followDialogTitle"
    @update:visible="onFollowDialogVisibility">
    <div class="follow-dialog">
      <div class="follow-tabs" role="tablist" aria-label="Followers and following">
        <button type="button" class="follow-tab" :class="{ 'is-active': followList === 'followers' }" role="tab"
          :aria-selected="followList === 'followers'" @click="switchFollowList('followers')">
          Followers <span>{{ stats?.followers ?? 0 }}</span>
        </button>
        <button type="button" class="follow-tab" :class="{ 'is-active': followList === 'following' }" role="tab"
          :aria-selected="followList === 'following'" @click="switchFollowList('following')">
          Following <span>{{ stats?.following ?? 0 }}</span>
        </button>
      </div>

      <InputText v-model="followQuery" name="follow-search" size="small" autocomplete="off" placeholder="Search people"
        aria-label="Search people" fluid />

      <p v-if="followLoading && !followItems.length" class="follow-state">Loading…</p>
      <p v-else-if="!followItems.length" class="follow-state">
        {{ followQuery.trim() ? 'No one matches this search.' : 'No one here yet.' }}
      </p>
      <div v-else class="follow-list">
        <div v-for="person in followItems" :key="person.sid" class="follow-row">
          <NuxtLink v-if="person.username" :to="`/${person.username}`" class="follow-person"
            @click="followDialog = false">
            <UserAvatar :src="person.avatarUrl" :size="36" />
            <span class="follow-person-main">
              <span class="follow-name">{{ person.nickname }}</span>
              <span class="follow-handle">@{{ person.username }}</span>
            </span>
          </NuxtLink>
          <div v-else class="follow-person follow-person--static">
            <UserAvatar :src="person.avatarUrl" :size="36" />
            <span class="follow-person-main">
              <span class="follow-name">{{ person.nickname }}</span>
              <span class="follow-handle">No public profile</span>
            </span>
          </div>
          <Button v-if="followCanManage" :label="followList === 'followers' ? 'Remove' : 'Unfollow'" size="small" text
            severity="danger" @click="removeFollow(person)" />
        </div>
      </div>

      <div v-if="followItems.length < followTotal" class="follow-more">
        <Button label="Load more" size="small" severity="secondary" outlined :loading="followLoading"
          @click="loadFollows(false)" />
      </div>
    </div>
  </Dialog>

  <ReportDialog v-if="profile && !profile.isOwner" v-model:visible="reportUserDialog" target-kind="user"
    :username="profile.username" :target-name="profile.nickname" />
</template>

<script setup lang="ts">
import LinkIcon from '@primeicons/vue/link'

interface Profile {
  username: string
  nickname: string
  bio: string
  avatarUrl: string | null
  createdAt: string
  isOwner: boolean
  isFollowing: boolean
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

interface FollowPerson {
  sid: string
  username: string | null
  nickname: string
  avatarUrl: string | null
}

type FollowList = 'followers' | 'following'

const props = defineProps<{ username: string }>()
const route = useRoute()
const { user: authUser } = useAuthUser()
const toast = useToast()
const confirm = useConfirm()
const contentRefresh = useState('profile-content-refresh', () => 0)

const { data, refresh } = useFetch<{
  profile: Profile
  stats: Stats
  links: LinkItem[]
}>(`/api/users/${encodeURIComponent(props.username)}`, { key: `public-profile-${props.username}` })

const profile = computed(() => data.value?.profile ?? null)
const stats = computed(() => data.value?.stats ?? null)
const links = computed(() => data.value?.links ?? [])

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

function unit(count: number, singular: string, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm
}

// ---------- 关注 ----------
const followBusy = ref(false)

async function toggleFollow() {
  if (!profile.value || followBusy.value) return
  followBusy.value = true
  try {
    if (profile.value.isFollowing) {
      await $fetch(`/api/users/${encodeURIComponent(props.username)}/follow`, { method: 'DELETE' })
      toast.add({ severity: 'success', summary: `Unfollowed @${props.username}`, life: 2500 })
    } else {
      await $fetch(`/api/users/${encodeURIComponent(props.username)}/follow`, { method: 'POST' })
      toast.add({ severity: 'success', summary: `Following @${props.username}`, life: 2500 })
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

// ---------- 举报用户 ----------
const reportUserDialog = ref(false)

async function openReportUser() {
  if (!authUser.value) {
    await navigateTo('/sign')
    return
  }
  reportUserDialog.value = true
}

// ---------- 分组新建 ----------
const groupDialogVisible = ref(false)

function openGroupCreate() {
  groupDialogVisible.value = true
}

async function onGroupSaved() {
  await refresh()
  contentRefresh.value += 1
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
const followDialog = ref(false)
const followList = ref<FollowList>('followers')
const followItems = ref<FollowPerson[]>([])
const followTotal = ref(0)
const followQuery = ref('')
const followLoading = ref(false)
const followCanManage = ref(false)
let followSeq = 0

const followDialogTitle = computed(() =>
  `${followList.value === 'followers' ? 'Followers' : 'Following'} · @${props.username}`
)

async function loadFollows(reset: boolean) {
  if (!followDialog.value) return
  const seq = ++followSeq
  const offset = reset ? 0 : followItems.value.length
  followLoading.value = true
  try {
    const response = await $fetch<{ items: FollowPerson[], total: number, isOwner: boolean }>('/api/follows', {
      query: { username: props.username, list: followList.value, q: followQuery.value.trim(), limit: 20, offset }
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

function openFollowDialogFromQuery() {
  if (!profile.value?.isOwner) return
  const dialog = String(route.query.dialog ?? '')
  if (dialog !== 'followers' && dialog !== 'following') return
  openFollowDialog(dialog)
}

function onFollowDialogVisibility(open: boolean) {
  if (open || !route.query.dialog) return
  const query = { ...route.query }
  delete query.dialog
  void navigateTo({ path: route.path, query }, { replace: true })
}

watch(profile, openFollowDialogFromQuery, { immediate: true })
watch(() => route.query.dialog, openFollowDialogFromQuery)

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
        toast.add({
          severity: 'success',
          summary: removingFollower ? 'Follower removed' : 'Unfollowed',
          life: 2500
        })
        await refresh()
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
</script>

<style scoped lang="scss">
.profile-card { position:sticky; top:1.5rem; display:flex; flex-direction:column; gap:.6rem; min-height:18rem; padding:1.5rem; border:1px solid var(--p-content-border-color); border-radius:1rem; background:var(--p-content-background); }
.profile-loading { display:grid; flex:1; place-items:center; min-height:15rem; }
.profile-name { margin:.4rem 0 0; font-size:1.5rem; font-weight:700; letter-spacing:-.02em; word-break:break-word; }
.profile-handle { margin:0; font-size:.9rem; color:var(--p-text-muted-color); }
.profile-bio { margin:.5rem 0 0; font-size:.9rem; line-height:1.7; color:var(--p-text-muted-color); white-space:pre-line; }
.profile-meta { margin:.4rem 0 0; font-size:.78rem; color:var(--p-text-muted-color); }
.profile-links { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.2rem; }
.profile-link { display:inline-flex; align-items:center; gap:.3rem; padding:.15rem .5rem; border:1px solid var(--p-content-border-color); border-radius:999px; color:inherit; font-size:.74rem; text-decoration:none; }
.profile-link svg { width:.8rem; height:.8rem; }
.profile-stats { display:flex; flex-direction:column; gap:.7rem; margin:.9rem 0 0; padding-top:.9rem; border-top:1px solid var(--p-content-border-color); }
.stat-group { display:flex; flex-direction:column; gap:.15rem; }
.stat-group-label { font-size:.68rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--p-text-muted-color); }
.stat-values { display:flex; flex-wrap:wrap; gap:.2rem .6rem; }
.stat-value { font-size:.8rem; color:var(--p-text-muted-color); white-space:nowrap; }
.stat-value strong { margin-right:.28rem; font-size:1.05rem; font-weight:600; color:var(--p-text-color); font-variant-numeric:tabular-nums; }
.stat-button { padding:0; border:0; background:none; font:inherit; cursor:pointer; }
.stat-button:hover { color:var(--p-text-color); }
.profile-breakdown { margin:0; font-size:.72rem; color:var(--p-text-muted-color); }
.profile-actions { display:flex; flex-direction:column; gap:.45rem; margin-top:.5rem; padding-top:.75rem; border-top:1px solid var(--p-content-border-color); }
.action-grid { display:grid; grid-template-columns:1fr 1fr; gap:.45rem; }
.action-manage { display:grid; grid-template-columns:1fr 1fr; gap:.2rem; }
.dialog-hint { margin:0 0 .5rem; font-size:.8rem; color:var(--p-text-muted-color); }
.dialog-form { display:flex; flex-direction:column; gap:.65rem; }
.link-row { display:grid; grid-template-columns:10rem minmax(0,1fr) auto; gap:.5rem; align-items:center; }
.link-remove { border:0; background:none; color:var(--p-text-muted-color); font-size:1.1rem; cursor:pointer; }
.follow-dialog { display:flex; flex-direction:column; gap:.65rem; }
.follow-tabs { display:flex; gap:.3rem; border-bottom:1px solid var(--p-content-border-color); }
.follow-tab { padding:.45rem .5rem; border:0; border-bottom:2px solid transparent; background:none; color:var(--p-text-muted-color); font:inherit; font-size:.82rem; cursor:pointer; }
.follow-tab.is-active { border-bottom-color:var(--p-primary-color); color:var(--p-text-color); }
.follow-tab span { margin-left:.25rem; font-size:.72rem; }
.follow-list { display:flex; flex-direction:column; max-height:22rem; overflow-y:auto; }
.follow-row { display:flex; align-items:center; gap:.5rem; padding:.5rem 0; border-top:1px solid var(--p-content-border-color); }
.follow-person { display:flex; flex:1; align-items:center; gap:.55rem; min-width:0; color:inherit; text-decoration:none; }
.follow-person-main { display:flex; flex-direction:column; min-width:0; }
.follow-name { font-size:.85rem; font-weight:500; }
.follow-handle { font-size:.72rem; color:var(--p-text-muted-color); }
.follow-state { padding:1rem 0; font-size:.82rem; color:var(--p-text-muted-color); }
.follow-more { display:flex; justify-content:center; }
.form-error { margin:0; font-size:.82rem; color:var(--p-red-500,#ef4444); }
@media (max-width: 900px) { .profile-card { position:static; } .link-row { grid-template-columns:1fr; } }
</style>
