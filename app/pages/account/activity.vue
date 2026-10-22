<template>
  <h2 class="section-title">Reports & feedback</h2>

  <div class="activity-toolbar">
    <SelectButton v-model="tab" :options="TAB_OPTIONS" option-label="label" option-value="value"
      :allow-empty="false" aria-label="Activity type" />
    <InputText v-model="query" size="small" :placeholder="tab === 'feedback' ? 'Search feedback' : 'Search reports'"
      :aria-label="tab === 'feedback' ? 'Search feedback' : 'Search reports'" autocomplete="off" />
  </div>

  <p class="activity-note">Showing the latest {{ total || 0 }} entries (maximum 100).</p>

  <div v-if="loading && !items.length" class="activity-state">Loading…</div>
  <p v-else-if="!items.length" class="activity-state">
    {{ query.trim() ? 'No entries match this search.' : (tab === 'feedback' ? 'No feedback received yet.' : 'No reports submitted yet.') }}
  </p>

  <div v-else class="activity-list">
    <article v-for="item in items" :key="item.sid" class="activity-card">
      <div class="activity-head">
        <div class="activity-title-row">
          <Tag :value="tab === 'feedback' ? statusLabel(item.status) : statusLabel(item.status)"
            :severity="item.status === 'closed' ? 'secondary' : 'warn'" rounded />
          <span class="activity-type">{{ typeLabel(item) }}</span>
        </div>
        <span class="activity-date">{{ formatDate(item.createdAt) }}</span>
      </div>

      <template v-if="tab === 'feedback'">
        <p class="activity-target">
          On
          <NuxtLink :to="`/${item.snippet.username}/${item.snippet.slug}`" class="activity-link">
            {{ item.snippet.name }}
          </NuxtLink>
          · from {{ item.from.username ? `@${item.from.username}` : item.from.nickname }}
        </p>
        <p class="activity-detail">{{ item.detail }}</p>
        <div class="activity-actions">
          <Button v-if="item.status === 'open'" label="Mark read" size="small" text severity="secondary"
            :loading="updating === item.sid" @click="setFeedbackStatus(item, 'read')" />
          <Button v-if="item.status !== 'closed'" label="Close" size="small" text severity="secondary"
            :loading="updating === item.sid" @click="setFeedbackStatus(item, 'closed')" />
        </div>
      </template>

      <template v-else>
        <p class="activity-target">
          {{ targetKindLabel(item.target.kind) }}:
          <NuxtLink v-if="item.target.username && !item.target.deleted"
            :to="item.target.kind === 'user' ? `/${item.target.username}` : `/${item.target.username}/${item.target.slug}`"
            class="activity-link">
            {{ item.target.name }}
          </NuxtLink>
          <span v-else>{{ item.target.name }} (deleted)</span>
        </p>
        <p class="activity-detail">{{ item.detail }}</p>
      </template>
    </article>
  </div>

  <div v-if="items.length < total" class="activity-more">
    <Button label="Load more" size="small" severity="secondary" outlined :loading="loading" @click="load(false)" />
  </div>
</template>

<script setup lang="ts">
import { FEEDBACK_TYPES, REPORT_TYPES, moderationTypeLabel, type ReportTargetKind } from '#shared/utils/moderation'

const TAB_OPTIONS = [
  { label: 'Feedback received', value: 'feedback' },
  { label: 'My reports', value: 'reports' }
]

interface FeedbackItem {
  sid: string
  type: string
  detail: string
  status: string
  createdAt: string
  snippet: { slug: string, name: string, username: string }
  from: { username: string | null, nickname: string, avatarUrl: string | null }
}

interface ReportItem {
  sid: string
  type: string
  detail: string
  status: string
  createdAt: string
  target: {
    kind: ReportTargetKind
    name: string
    username: string | null
    slug: string | null
    deleted: boolean
  }
}

type ActivityItem = FeedbackItem | ReportItem

useHead({ title: 'Reports & feedback' })

const toast = useToast()
const route = useRoute()
const tab = ref<'feedback' | 'reports'>(route.query.tab === 'reports' ? 'reports' : 'feedback')
const query = ref('')
const items = ref<ActivityItem[]>([])
const total = ref(0)
const loading = ref(false)
const updating = ref('')
let seq = 0

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

function statusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function targetKindLabel(value: string) {
  return value === 'snippet' ? 'Snippet' : value === 'group' ? 'Group' : 'User'
}

function typeLabel(item: ActivityItem) {
  if (tab.value === 'feedback') return moderationTypeLabel(FEEDBACK_TYPES, item.type)
  const kind = (item as ReportItem).target.kind
  return moderationTypeLabel(REPORT_TYPES[kind], item.type)
}

async function load(reset: boolean) {
  const current = ++seq
  const offset = reset ? 0 : items.value.length
  loading.value = true
  try {
    const endpoint = tab.value === 'feedback' ? '/api/account/feedback' : '/api/account/reports'
    const response = await $fetch<{ items: ActivityItem[], total: number }>(endpoint, {
      query: { q: query.value.trim(), limit: 20, offset }
    })
    if (current !== seq) return
    items.value = reset ? response.items : [...items.value, ...response.items]
    total.value = response.total
  } catch {
    if (current === seq && reset) {
      items.value = []
      total.value = 0
    }
  } finally {
    if (current === seq) loading.value = false
  }
}

function reload() {
  void load(true)
}

const search = debounce(() => { void load(true) }, 250)
watch(query, () => search.run())
watch(tab, () => {
  query.value = ''
  reload()
})
watch(() => route.query.tab, value => {
  const next = value === 'reports' ? 'reports' : 'feedback'
  if (next !== tab.value) tab.value = next
})

async function setFeedbackStatus(item: ActivityItem, status: 'read' | 'closed') {
  if (updating.value) return
  updating.value = item.sid
  try {
    await $fetch(`/api/account/feedback/${encodeURIComponent(item.sid)}`, { method: 'PATCH', body: { status } })
    ;(item as FeedbackItem).status = status
    toast.add({ severity: 'success', summary: `Feedback marked ${status}`, life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Could not update feedback', life: 4000 })
  } finally {
    updating.value = ''
  }
}

onMounted(() => { void load(true) })
</script>

<style scoped lang="scss">
.activity-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem 0 0.75rem;

  :deep(.p-inputtext) {
    width: 17rem;
    max-width: 45vw;
  }
}

.activity-note,
.activity-state {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.activity-state {
  padding: 2rem 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.activity-card {
  padding: 0.9rem 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.7rem;
  background: var(--p-content-background);
}

.activity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.activity-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.activity-type {
  font-size: 0.78rem;
  font-weight: 600;
}

.activity-date {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.activity-target {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.activity-link {
  color: var(--p-text-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.activity-detail {
  margin: 0.45rem 0 0;
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.activity-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.3rem;
  margin-top: 0.35rem;
}

.activity-more {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

@media (max-width: 700px) {
  .activity-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .activity-toolbar :deep(.p-inputtext) {
    width: 100%;
    max-width: none;
  }
}
</style>
