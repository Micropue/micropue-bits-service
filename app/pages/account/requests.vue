<template>
  <h2 class="section-title">Language &amp; dependency requests</h2>

  <section class="group">
    <h3 class="group-title">Submit an entry</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Missing a language or a package?</span>
          <span class="row-desc">
            Send us the name and the official website — an administrator completes the rest and publishes it.
          </span>
        </div>
        <div class="row-control">
          <NuxtLink to="/request" class="plain-link">
            <Button label="Submit an entry" size="small" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">
      My requests
      <span v-if="total > 0" class="group-count">{{ items.length }} / {{ total }}</span>
    </h3>

    <div v-if="!items.length && !loading" class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">No requests yet</span>
          <span class="row-desc">Everything you submit shows up here with its review status.</span>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="req-table">
          <thead>
            <tr>
              <th>Name</th>
              <th class="col-type">Type</th>
              <th class="col-langs">Languages</th>
              <th>Official website</th>
              <th class="col-date">Submitted</th>
              <th class="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="request in items" :key="request.sid">
              <tr>
                <td class="cell-name">{{ request.name }}</td>
                <td class="col-type">
                  <span class="type-chip">{{ request.kind === 'language' ? 'Language' : 'Dependency' }}</span>
                </td>
                <td class="col-langs">
                  <template v-if="request.languages.length">
                    <span v-for="language in request.languages" :key="language.sid"
                      :class="['lang-chip', { 'is-primary': language.isPrimary }]">{{ language.name }}</span>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
                <td class="cell-link">
                  <a :href="request.link_url" target="_blank" rel="noopener">{{ hostname(request.link_url) }}</a>
                </td>
                <td class="col-date muted">{{ formatDate(request.created_at) }}</td>
                <td class="col-status">
                  <!-- 用 flex 行承载「状态 + 链接」，避免 inline-flex 与行内链接的基线错位 -->
                  <div class="status-cell">
                    <!-- 已通过：状态 + 目录链接；已驳回：点击展开原因 -->
                    <span class="status" :class="`status--${request.status}`">
                      <CheckCircle v-if="request.status === 'approved'" aria-hidden="true" />
                      <TimesCircle v-else-if="request.status === 'rejected'" aria-hidden="true" />
                      <Clock v-else aria-hidden="true" />
                      <template v-if="request.status === 'rejected' && request.reject_reason">
                        <button type="button" class="reason-toggle" :aria-expanded="openReason === request.sid"
                          @click="toggleReason(request.sid)">
                          {{ STATUS_LABEL[request.status] }}
                          <ChevronDown class="reason-caret" aria-hidden="true" />
                        </button>
                      </template>
                      <template v-else>{{ STATUS_LABEL[request.status] }}</template>
                    </span>
                    <NuxtLink v-if="request.published" :to="request.published.to" class="view-link">
                      View in catalog
                    </NuxtLink>
                  </div>
                </td>
              </tr>
              <!-- 驳回原因：点击状态后展开一行 -->
              <tr v-if="openReason === request.sid" class="reason-row">
                <td :colspan="6">
                  <span class="reason-label">Reason</span>
                  {{ request.reject_reason }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div v-if="hasMore" class="more-row">
        <Button label="Load more" severity="secondary" outlined size="small" :loading="loading" @click="loadMore" />
        <span class="muted">{{ items.length }} of {{ total }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import CheckCircle from '@primeicons/vue/check-circle'
import ChevronDown from '@primeicons/vue/chevron-down'
import Clock from '@primeicons/vue/clock'
import TimesCircle from '@primeicons/vue/times-circle'

// 我的目录条目申请：小表显示，一次 10 条，可「加载更多」
useHead({ title: 'Language & dependency requests' })

interface RequestLanguage {
  sid: string
  name: string
  isPrimary: boolean
}

interface CatalogRequest {
  sid: string
  kind: 'language' | 'dependency'
  status: 'pending' | 'approved' | 'rejected'
  name: string
  link_url: string
  dependency_kind: string | null
  languages: RequestLanguage[]
  reject_reason: string
  created_at: string
  reviewed_at: string | null
  published: { to: string, label: string } | null
}

const PAGE_SIZE = 10

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Published',
  rejected: 'Rejected'
}

const request = useRequestFetch()
const items = ref<CatalogRequest[]>([])
const total = ref(0)
const loading = ref(false)
const openReason = ref('')

const hasMore = computed(() => items.value.length < total.value)

async function fetchPage(offset: number) {
  loading.value = true
  try {
    const res = await request<{ requests: CatalogRequest[], total: number }>('/api/catalog-requests/mine', {
      query: { limit: PAGE_SIZE, offset }
    })
    items.value = offset === 0 ? res.requests : [...items.value, ...res.requests]
    total.value = res.total
  } finally {
    loading.value = false
  }
}

// 首屏（SSR 也走这条路，Cookie 由 useRequestFetch 带上）
await fetchPage(0)

function loadMore() {
  if (hasMore.value && !loading.value) return fetchPage(items.value.length)
}

function toggleReason(sid: string) {
  openReason.value = openReason.value === sid ? '' : sid
}

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}
</script>

<style scoped lang="scss">
.plain-link {
  text-decoration: none;
}

.group-title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.group-count {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
}

.table-wrap {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--p-content-background);
}

.req-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;

  th,
  td {
    padding: 0.7rem 0.9rem;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: var(--panel);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--p-text-muted-color);
    white-space: nowrap;
  }

  tbody tr + tr td {
    border-top: 1px solid var(--border);
  }
}

.cell-name {
  font-weight: 500;
  white-space: nowrap;
}

.cell-link a {
  color: var(--p-text-color);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--p-text-color) 30%, transparent);
}

.type-chip {
  display: inline-block;
  padding: 0.05rem 0.45rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.lang-chip {
  display: inline-block;
  margin-right: 0.3rem;
  padding: 0.05rem 0.4rem;
  border-radius: 6px;
  background: var(--panel);
  font-size: 0.76rem;
  color: var(--p-text-muted-color);

  &.is-primary {
    color: var(--p-text-color);
    font-weight: 500;
  }
}

.col-date,
.muted {
  color: var(--p-text-muted-color);
}

.col-date {
  white-space: nowrap;
}

.col-status {
  white-space: nowrap;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 500;

  svg {
    width: 1em;
    height: 1em;
  }

  &--pending {
    color: var(--p-orange-500);
  }

  &--approved {
    color: var(--p-green-600, #16a34a);
  }

  &--rejected {
    color: var(--p-red-500);
  }
}

.reason-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  cursor: pointer;
}

.reason-caret {
  width: 0.85em;
  height: 0.85em;
}

.view-link {
  color: var(--p-text-color);
  font-size: 0.82rem;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--p-text-color) 30%, transparent);
}

.reason-row td {
  padding-top: 0;
  font-size: 0.84rem;
  color: var(--p-text-muted-color);
}

.reason-label {
  margin-right: 0.4rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.more-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.9rem;
}

/* 窄屏：隐藏次要列，保留名称 / 官网 / 状态 */
@media (max-width: 720px) {
  .col-type,
  .col-langs,
  .col-date {
    display: none;
  }
}
</style>
