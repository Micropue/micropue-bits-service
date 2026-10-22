<template>
  <div class="public-page">
    <div v-if="pending" class="state-panel">Loading…</div>

    <template v-else-if="kind">
      <header class="content-head">
        <div class="title-row">
          <h1 class="content-title">{{ title }}</h1>
          <Tag v-if="visibility === 'private'" value="Private" severity="warn" rounded />
          <Tag v-else-if="visibility === 'unlisted'" value="Unlisted" severity="secondary" rounded />
          <Tag v-if="isOwner" value="Your content" severity="secondary" outlined rounded />
        </div>
        <p class="content-meta">
          <template v-if="kind === 'snippet'">
            <span>{{ snippet?.language?.name ?? 'Snippet' }}</span>
            <span aria-hidden="true">·</span>
            <span>Updated {{ formatDate(snippet?.updatedAt ?? '') }}</span>
          </template>
          <template v-else>
            <span>Group</span>
            <span aria-hidden="true">·</span>
            <span>{{ groupSnippets.length }} snippet{{ groupSnippets.length === 1 ? '' : 's' }}</span>
            <span aria-hidden="true">·</span>
            <span>Updated {{ formatDate(group?.updatedAt ?? '') }}</span>
          </template>
        </p>
      </header>

      <div class="detail-layout">
        <!-- 左：单卡片分栏，作者为主，其余为次级信息 -->
        <aside class="detail-side" :class="{ 'detail-side--with-feedback': kind === 'snippet' }">
          <div class="side-panel">
            <NuxtLink :to="`/${author.username}`" class="side-author">
              <UserAvatar :src="author.avatarUrl" :size="44" />
              <span class="side-author-main">
                <span class="side-author-name">{{ author.nickname }}</span>
                <span class="side-author-handle">@{{ author.username }}</span>
              </span>
              <ArrowUpRight class="side-author-arrow" aria-hidden="true" />
            </NuxtLink>

            <section v-if="intro" class="side-section">
              <h2 class="side-label">About</h2>
              <p class="side-text">{{ intro }}</p>
            </section>

            <section v-if="kind === 'snippet' && snippet?.forkFrom" class="side-section">
              <h2 class="side-label">Forked from</h2>
              <NuxtLink :to="`/${snippet.forkFrom.author.username}/${snippet.forkFrom.slug}`" class="side-chip">
                @{{ snippet.forkFrom.author.username }}/{{ snippet.forkFrom.slug }}
              </NuxtLink>
            </section>

            <section v-if="kind === 'group' && group?.forkFrom" class="side-section">
              <h2 class="side-label">Forked from</h2>
              <NuxtLink :to="`/${group.forkFrom.author.username}/${group.forkFrom.slug}`" class="side-chip">
                @{{ group.forkFrom.author.username }}/{{ group.forkFrom.slug }}
              </NuxtLink>
            </section>

            <section v-if="kind === 'snippet' && snippet?.language" class="side-section">
              <h2 class="side-label">Language</h2>
              <NuxtLink :to="`/language/${snippet.language.slug}`" class="side-chip">
                <img v-if="snippet.language.logo_url" class="side-logo" :src="snippet.language.logo_url" alt=""
                  width="16" height="16" loading="lazy">
                {{ snippet.language.name }}
              </NuxtLink>
            </section>

            <section v-if="kind === 'snippet' && snippet?.dependencies.length" class="side-section">
              <h2 class="side-label">Dependencies</h2>
              <div class="side-chips">
                <NuxtLink v-for="dependency in snippet.dependencies" :key="dependency.slug"
                  :to="`/${dependency.kind}/${dependency.slug}`" class="side-chip">
                  <img v-if="dependency.logo_url" class="side-logo" :src="dependency.logo_url" alt="" width="16"
                    height="16" loading="lazy">
                  {{ dependency.name }}
                </NuxtLink>
              </div>
            </section>

            <section v-if="tags.length" class="side-section">
              <h2 class="side-label">Tags</h2>
              <div class="side-chips">
                <span v-for="tag in tags" :key="tag.key" class="side-tag">{{ tag.name }}</span>
              </div>
            </section>

            <section class="side-section side-stats">
              <template v-if="kind === 'snippet'">
                <div><span>Copies</span><strong>{{ copyCount }}</strong></div>
                <div><span>Forks</span><strong>{{ snippet?.forkCount ?? 0 }}</strong></div>
                <div><span>Favorites</span><strong>{{ favoriteCount }}</strong></div>
              </template>
              <template v-else>
                <div><span>Snippets</span><strong>{{ groupSnippets.length }}</strong></div>
                <div><span>Forks</span><strong>{{ group?.forkCount ?? 0 }}</strong></div>
                <div><span>Favorites</span><strong>{{ favoriteCount }}</strong></div>
              </template>
            </section>

            <div v-if="isOwner || visibility !== 'private'" class="side-actions">
              <template v-if="isOwner">
                <Button v-if="kind === 'snippet'" label="Edit snippet" size="small" outlined fluid
                  @click="navigateTo(`/${author.username}/${snippet?.slug}/edit`)" />
                <Button v-else label="Edit group" size="small" outlined fluid @click="editGroupDialog = true" />
              </template>
              <template v-else>
                <Button :label="isFavorited ? 'Saved' : 'Save'" size="small" severity="secondary" outlined fluid
                  :loading="favoriteBusy" @click="toggleFavorite" />
                <div v-if="kind === 'snippet' || visibility === 'public'" class="side-subactions">
                  <Button v-if="kind === 'snippet'" label="Feedback" size="small" severity="secondary" outlined
                    fluid @click="openFeedback">
                    <template #icon><Comment /></template>
                  </Button>
                  <Button v-if="visibility === 'public'" label="Report" size="small" severity="danger" outlined fluid
                    @click="openReport">
                    <template #icon><Flag /></template>
                  </Button>
                </div>
                <Button v-if="kind === 'group' && group?.visibility === 'public'" label="Fork group" size="small"
                  outlined fluid :loading="forking" @click="forkGroup" />
              </template>
            </div>
          </div>

          <section v-if="kind === 'snippet' && snippet" class="feedback-section" aria-labelledby="feedback-title">
            <header class="feedback-head">
              <h2 id="feedback-title" class="feedback-title">
                Feedback
                <span class="feedback-count">{{ feedbackTotal }}</span>
              </h2>
              <InputText v-if="feedbackTotal || feedbackQuery" v-model="feedbackQuery" size="small"
                class="feedback-search" placeholder="Search feedback" aria-label="Search feedback"
                autocomplete="off" />
            </header>

            <p v-if="feedbackLoading && !feedbackItems.length" class="feedback-empty">Loading…</p>
            <p v-else-if="!feedbackItems.length" class="feedback-empty">
              {{ feedbackQuery.trim() ? 'No feedback matches this search.' : 'No feedback yet.' }}
            </p>
            <div v-else class="feedback-list">
              <article v-for="item in feedbackItems" :key="item.sid" class="feedback-item">
                <UserAvatar :src="item.from.avatarUrl" :size="32" />
                <div class="feedback-main">
                  <div class="feedback-meta">
                    <NuxtLink v-if="item.from.username" :to="`/${item.from.username}`" class="feedback-author">
                      @{{ item.from.username }}
                    </NuxtLink>
                    <span v-else class="feedback-author">{{ item.from.nickname }}</span>
                    <span aria-hidden="true">·</span>
                    <span>{{ feedbackTypeLabel(item.type) }}</span>
                    <span aria-hidden="true">·</span>
                    <time>{{ formatDate(item.createdAt) }}</time>
                  </div>
                  <p class="feedback-detail">{{ item.detail }}</p>
                </div>
              </article>
            </div>

            <div v-if="feedbackItems.length < feedbackTotal" class="feedback-more">
              <Button label="Load more feedback" size="small" severity="secondary" outlined
                :loading="feedbackLoading" @click="loadFeedback(false)" />
            </div>
          </section>
        </aside>

        <!-- 右：代码 / 分组内容 -->
        <main class="detail-main">
          <template v-if="kind === 'snippet' && snippet">
            <div class="code-block">
              <div class="code-head">
                <span class="code-lang">{{ snippet.language?.name ?? 'Code' }}</span>
                <div class="code-actions">
                  <Button v-if="!snippet.isOwner && snippet.visibility === 'public'" label="Fork" size="small"
                    severity="secondary" outlined :loading="forking" @click="forkSnippet" />
                  <Button :label="copied ? 'Copied' : 'Copy'" size="small" text @click="copyCode" />
                </div>
              </div>
              <ClientOnly>
                <CodeEditor :model-value="snippet.code" :language="snippet.language?.name" readonly
                  :show-line-numbers="false" />
                <template #fallback>
                  <pre class="code-pre code-highlight"><code><template v-for="(token, index) in tokens"
                    :key="index"><span :class="`tok-${token.type}`">{{ token.text }}</span></template></code></pre>
                </template>
              </ClientOnly>
            </div>
          </template>

          <template v-else>
            <p v-if="!groupSnippets.length" class="empty-group">
              {{ isOwner ? 'No snippets in this group yet — add one from the snippet editor.' : 'No public snippets in this group yet.' }}
            </p>
            <div v-else class="group-snippets">
              <NuxtLink v-for="item in groupSnippets" :key="item.slug" :to="`/${author.username}/${item.slug}`"
                class="group-snippet">
                <div class="group-snippet-head">
                  <span class="group-snippet-lang">
                    <img v-if="item.language?.logo_url" class="side-logo" :src="item.language.logo_url" alt=""
                      width="14" height="14" loading="lazy">
                    {{ item.language?.name ?? 'Snippet' }}
                  </span>
                  <span class="group-snippet-date">{{ formatDate(item.updated_at) }}</span>
                </div>
                <h2 class="group-snippet-name">{{ item.name }}</h2>
                <p v-if="item.intro" class="group-snippet-intro">{{ item.intro }}</p>
                <div class="side-chips">
                  <span v-if="isOwner" class="side-tag" :class="`side-tag--${item.visibility}`">
                    {{ item.visibility }}
                  </span>
                  <span v-for="tag in item.tags" :key="tag.key" class="side-tag">{{ tag.name }}</span>
                </div>
              </NuxtLink>
            </div>
          </template>
        </main>
      </div>
    </template>
  </div>

  <GroupDialog v-model:visible="editGroupDialog" :group="group" @saved="refreshGroup" />
  <FeedbackDialog v-if="snippet" v-model:visible="feedbackDialog" :username="author.username" :slug="snippet.slug"
    :snippet-name="snippet.name" @submitted="refreshFeedback" />
  <ReportDialog v-if="kind" v-model:visible="reportDialog"
    :target-kind="kind === 'group' ? 'group' : 'snippet'" :username="author.username"
    :slug="kind === 'snippet' ? snippet?.slug : group?.slug" :target-name="title" />
  <Toast />
</template>

<script setup lang="ts">
import ArrowUpRight from '@primeicons/vue/arrow-up-right'
import Comment from '@primeicons/vue/comment'
import Flag from '@primeicons/vue/flag'
import { FEEDBACK_TYPES, moderationTypeLabel } from '#shared/utils/moderation'

// 公开内容页 /{username}/{slug}：同一命名空间下渲染代码段或分组
// public 所有人可见；unlisted 凭链接可见；private 仅作者本人；无权限统一 404
interface TagItem {
  key: string
  name: string
}

interface SnippetDetail {
  slug: string
  name: string
  intro: string
  code: string
  visibility: 'public' | 'unlisted' | 'private'
  copyCount: number
  forkCount: number
  favoriteCount: number
  isFavorited: boolean
  forkFrom: { slug: string, name: string, author: { username: string, nickname: string } } | null
  createdAt: string
  updatedAt: string
  language: { slug: string, name: string, logo_url: string | null } | null
  tags: TagItem[]
  dependencies: { slug: string, name: string, kind: string, logo_url: string | null }[]
  author: { username: string, nickname: string, avatarUrl: string | null }
  isOwner: boolean
}

interface GroupDetail {
  slug: string
  name: string
  intro: string
  visibility: 'public' | 'unlisted' | 'private'
  forkCount: number
  favoriteCount: number
  isFavorited: boolean
  forkFrom: { slug: string, name: string, author: { username: string, nickname: string } } | null
  createdAt: string
  updatedAt: string
  tags: TagItem[]
  author: { username: string, nickname: string, avatarUrl: string | null }
  isOwner: boolean
}

interface GroupSnippet {
  slug: string
  name: string
  intro: string
  visibility: string
  updated_at: string
  language: { slug: string, name: string, logo_url: string | null } | null
  tags: TagItem[]
}

const route = useRoute()
const username = String(route.params.username ?? '')
const slug = String(route.params.slug ?? '')
const { user: authUser } = useAuthUser()
const toast = useToast()

const { data, pending, error, refresh } = await useFetch<
  | { kind: 'snippet', snippet: SnippetDetail }
  | { kind: 'group', group: GroupDetail, snippets: GroupSnippet[] }
>(`/api/users/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`, {
  key: `public-content-${username}-${slug}`
})

const editGroupDialog = ref(false)

function refreshGroup() {
  void refresh()
}

const kind = computed(() => data.value?.kind ?? null)
const snippet = computed(() => (data.value?.kind === 'snippet' ? data.value.snippet : null))
const group = computed(() => (data.value?.kind === 'group' ? data.value.group : null))
const groupSnippets = computed(() => (data.value?.kind === 'group' ? data.value.snippets : []))

const author = computed(() => snippet.value?.author ?? group.value?.author ?? {
  username,
  nickname: '',
  avatarUrl: null
})
const title = computed(() => snippet.value?.name ?? group.value?.name ?? '')
const intro = computed(() => snippet.value?.intro ?? group.value?.intro ?? '')
const tags = computed(() => snippet.value?.tags ?? group.value?.tags ?? [])
const visibility = computed(() => snippet.value?.visibility ?? group.value?.visibility ?? 'public')
const isOwner = computed(() => snippet.value?.isOwner ?? group.value?.isOwner ?? false)

const tokens = computed(() => tokenizeCode(snippet.value?.code ?? ''))
const copyCount = ref(0)
watch(snippet, value => { copyCount.value = Number(value?.copyCount ?? 0) }, { immediate: true })

const favoriteCount = ref(0)
const isFavorited = ref(false)
watch([snippet, group], () => {
  favoriteCount.value = Number(snippet.value?.favoriteCount ?? group.value?.favoriteCount ?? 0)
  isFavorited.value = snippet.value?.isFavorited ?? group.value?.isFavorited ?? false
}, { immediate: true })

const favoriteBusy = ref(false)

async function toggleFavorite() {
  if (favoriteBusy.value) return
  if (!authUser.value) {
    await navigateTo('/sign')
    return
  }
  favoriteBusy.value = true
  try {
    const response = await $fetch<{ favorited: boolean, count: number }>(
      `/api/users/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/favorite`,
      { method: isFavorited.value ? 'DELETE' : 'POST' }
    )
    isFavorited.value = response.favorited
    favoriteCount.value = response.count
    toast.add({
      severity: 'success',
      summary: response.favorited ? 'Saved to favorites' : 'Removed from favorites',
      life: 2500
    })
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    toast.add({ severity: 'error', summary: e.statusMessage ?? 'Action failed', life: 4000 })
  } finally {
    favoriteBusy.value = false
  }
}

const feedbackDialog = ref(false)
const reportDialog = ref(false)

async function openFeedback() {
  if (!authUser.value) {
    await navigateTo('/sign')
    return
  }
  feedbackDialog.value = true
}

async function openReport() {
  if (!authUser.value) {
    await navigateTo('/sign')
    return
  }
  reportDialog.value = true
}

// ---------- 公开反馈 / 评论 ----------
interface FeedbackItem {
  sid: string
  type: string
  detail: string
  createdAt: string
  from: { username: string | null, nickname: string, avatarUrl: string | null }
}

const feedbackItems = ref<FeedbackItem[]>([])
const feedbackTotal = ref(0)
const feedbackQuery = ref('')
const feedbackLoading = ref(false)
let feedbackSeq = 0

function feedbackTypeLabel(value: string) {
  return moderationTypeLabel(FEEDBACK_TYPES, value)
}

async function loadFeedback(reset: boolean) {
  if (!snippet.value) return
  const seq = ++feedbackSeq
  const offset = reset ? 0 : feedbackItems.value.length
  feedbackLoading.value = true
  try {
    const response = await $fetch<{ items: FeedbackItem[], total: number }>(
      `/api/users/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/feedback`,
      { query: { q: feedbackQuery.value.trim(), limit: 20, offset } }
    )
    if (seq !== feedbackSeq) return
    feedbackItems.value = reset ? response.items : [...feedbackItems.value, ...response.items]
    feedbackTotal.value = response.total
  } catch {
    if (seq === feedbackSeq && reset) {
      feedbackItems.value = []
      feedbackTotal.value = 0
    }
  } finally {
    if (seq === feedbackSeq) feedbackLoading.value = false
  }
}

function refreshFeedback() {
  void loadFeedback(true)
}

const feedbackSearch = debounce(() => { void loadFeedback(true) }, 250)
watch(feedbackQuery, () => feedbackSearch.run())
watch(snippet, value => {
  if (!value) return
  feedbackQuery.value = ''
  void loadFeedback(true)
}, { immediate: true })

// 不存在 / 私密内容：返回真正的 404 页面
if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString('en', { dateStyle: 'medium' }) : '—'
}

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copyCode() {
  if (!snippet.value) return
  try {
    await navigator.clipboard.writeText(snippet.value.code)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 2000)

    // 拷贝计数（限流 1 次/小时）；失败不影响复制
    const response = await $fetch<{ counted?: boolean }>(
      `/api/snippets/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/copy`,
      { method: 'POST' }
    ).catch(() => null)
    if (response?.counted) copyCount.value += 1
  } catch {
    // 剪贴板不可用时保持静默
  }
}

const forking = ref(false)

async function forkSnippet() {
  if (!snippet.value || forking.value) return
  forking.value = true
  try {
    const response = await $fetch<{ snippet: { slug: string } }>(
      `/api/snippets/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/fork`,
      { method: 'POST' }
    )
    await navigateTo(`/${authUser.value?.username ?? username}/${response.snippet.slug}`)
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    if (e.statusCode === 400 && e.statusMessage?.toLowerCase().includes('username')) {
      toast.add({
        severity: 'warn',
        summary: 'Set a username first',
        detail: 'Your public profile needs a username before you can fork a snippet.',
        life: 4500
      })
    } else {
      toast.add({ severity: 'error', summary: e.statusMessage ?? 'Fork failed', life: 4000 })
    }
  } finally {
    forking.value = false
  }
}

async function forkGroup() {
  if (!group.value || forking.value) return
  forking.value = true
  try {
    const response = await $fetch<{ group: { slug: string } }>(
      `/api/groups/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/fork`,
      { method: 'POST' }
    )
    await navigateTo(`/${authUser.value?.username ?? username}/${response.group.slug}`)
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    if (e.statusCode === 400 && e.statusMessage?.toLowerCase().includes('username')) {
      toast.add({
        severity: 'warn',
        summary: 'Set a username first',
        detail: 'Your public profile needs a username before you can fork a group.',
        life: 4500
      })
    } else {
      toast.add({ severity: 'error', summary: e.statusMessage ?? 'Fork failed', life: 4000 })
    }
  } finally {
    forking.value = false
  }
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})

useHead({
  title: () => (kind.value ? `${title.value} · @${author.value.username}` : 'Content'),
  meta: [
    { name: 'description', content: () => intro.value || 'A snippet shared on Bits.' },
    {
      name: 'robots',
      content: () => (kind.value && visibility.value !== 'public' ? 'noindex, nofollow' : 'index, follow')
    }
  ]
})
</script>

<style scoped lang="scss">
.public-page {
  width: min(1200px, 94vw);
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.content-head {
  margin-bottom: 1.75rem;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.content-title {
  margin: 0;
  font-size: clamp(1.8rem, 3.6vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  word-break: break-word;
}

.content-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

/* ---------- 左侧单卡片：作者为主 + 细分隔线 ---------- */
.detail-side {
  position: sticky;
  top: 1.5rem;
}

/* 左侧加入评论区后内容可能很高：保持 sticky，同时让整列在视口内滚动 */
.detail-side--with-feedback {
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
}

.side-panel {
  display: flex;
  flex-direction: column;
  padding: 0.35rem 1.15rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-content-background);
}

.side-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0;
  color: inherit;
  text-decoration: none;
}

.side-author-main {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.side-author-name {
  font-size: 0.98rem;
  font-weight: 600;
  word-break: break-word;
}

.side-author-handle {
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.side-author-arrow {
  flex-shrink: 0;
  width: 0.9rem;
  height: 0.9rem;
  margin-left: auto;
  color: var(--p-text-muted-color);
}

.side-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.8rem 0;
  border-top: 1px solid var(--p-content-border-color);
}

.side-label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.side-text {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
  white-space: pre-line;
}

.side-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.side-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.8rem;
  color: inherit;
  text-decoration: none;

  &:hover {
    border-color: color-mix(in srgb, var(--p-text-color) 30%, var(--p-content-border-color));
  }
}

.side-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: var(--logo-tint);
}

.side-tag {
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.75rem;
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
}

.side-stats {
  div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.82rem;
    color: var(--p-text-muted-color);
  }

  strong {
    font-size: 1rem;
    font-weight: 600;
    color: var(--p-text-color);
    font-variant-numeric: tabular-nums;
  }
}

.side-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.8rem 0;
  border-top: 1px solid var(--p-content-border-color);
}

.side-subactions {
  display: flex;
  gap: 0.4rem;
  width: 100%;

  :deep(.p-button) {
    flex: 1 1 0;
  }
}

/* ---------- 右：代码 / 分组列表 ---------- */
.detail-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.code-block {
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--p-text-color) 2%, var(--p-content-background));
}

.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.code-lang {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
}

.code-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.code-pre {
  margin: 0;
  padding: 1rem 1.1rem;
  overflow-x: auto;
  font-family: var(--font-code);
  font-size: 0.82rem;
  line-height: 1.7;
  white-space: pre;
  tab-size: 2;
}

/* ---------- 反馈 / 评论 ---------- */
.feedback-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.feedback-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
}

.feedback-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.feedback-count {
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--p-text-color) 8%, transparent);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.feedback-search {
  width: 100%;
  max-width: none;
}

.feedback-item :deep(.user-avatar) {
  flex: none;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.feedback-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.7rem;
  background: var(--p-content-background);
}

.feedback-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.feedback-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.feedback-author {
  color: var(--p-text-color);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.feedback-detail {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.feedback-empty {
  margin: 0;
  padding: 1rem 0;
  font-size: 0.84rem;
  color: var(--p-text-muted-color);
}

.feedback-more {
  display: flex;
  justify-content: center;
}

.empty-group {
  margin: 0;
  padding: 1.5rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 1rem;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.group-snippets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.group-snippet {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.1rem 1.15rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.9rem;
  background: var(--p-content-background);
  color: inherit;
  text-decoration: none;

  &:hover .group-snippet-name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.group-snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.group-snippet-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.group-snippet-date {
  flex-shrink: 0;
}

.group-snippet-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.group-snippet-intro {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-side,
  .detail-side--with-feedback {
    position: static;
    max-height: none;
    overflow: visible;
    order: 1;
  }

  .detail-main {
    order: 2;
  }
}
</style>
