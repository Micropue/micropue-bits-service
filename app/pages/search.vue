<template>
  <div class="search-page">
    <header class="search-head">
      <h1 class="search-title">Search</h1>
      <p class="search-subtitle">Search public snippets, groups, users and catalog entries.</p>
    </header>

    <form class="search-form" role="search" @submit.prevent="runNow">
      <InputText v-model="query" name="search" fluid autocomplete="off" spellcheck="false"
        placeholder="Search BITS" aria-label="Search BITS" />
      <Button type="submit" label="Search" />
    </form>

    <div class="search-tabs" role="tablist" aria-label="Search type">
      <button v-for="tab in TABS" :key="tab.value" type="button" role="tab" class="search-tab"
        :class="{ 'is-active': type === tab.value }" :aria-selected="type === tab.value" @click="selectType(tab.value)">
        <component :is="tab.icon" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </div>

    <p v-if="!term" class="search-hint">Type a keyword to search.</p>
    <template v-else>
      <p v-if="loading" class="search-status" role="status">Searching…</p>
      <p v-else-if="error" class="search-status search-status--error">{{ error }}</p>
      <p v-else-if="!sections.length" class="search-status">
        No results for “{{ term }}”.
      </p>

      <div v-else class="search-sections">
        <section v-for="section in sections" :key="section.type" class="search-section">
          <header class="section-head">
            <div class="section-head-main">
              <h2 class="section-title">{{ section.title }}</h2>
              <span class="section-count">{{ section.total }}</span>
            </div>
            <div v-if="type === 'dependencies' && section.type === 'dependencies'" class="dependency-filter">
              <label for="dependency-kind">Type</label>
              <Select input-id="dependency-kind" :model-value="dependencyKind" :options="DEPENDENCY_FILTERS"
                option-label="label" option-value="value" size="small" aria-label="Filter dependencies by type"
                @update:model-value="selectDependencyKind" />
            </div>
          </header>

          <div class="result-list">
            <NuxtLink v-for="item in section.items" :key="item.key" :to="item.to" class="result">
              <img v-if="item.logo" class="result-logo" :src="item.logo" alt="" width="28" height="28"
                loading="lazy">
              <span v-else class="result-logo result-logo--fallback" aria-hidden="true">{{ initial(item.title) }}</span>
              <span class="result-main">
                <strong class="result-title">{{ item.title }}</strong>
                <span class="result-sub">{{ item.subtitle }}</span>
              </span>
              <span v-if="item.kindLabel" class="result-kind">{{ item.kindLabel }}</span>
            </NuxtLink>
          </div>

          <NuxtLink v-if="section.moreTo" :to="section.moreTo" class="section-more">
            View all {{ section.total }} {{ section.title.toLowerCase() }} →
          </NuxtLink>
        </section>
      </div>

      <nav v-if="showPager" class="search-pager" aria-label="Search pagination">
        <Button label="Previous" size="small" severity="secondary" outlined :disabled="page <= 1"
          @click="changePage(-1)" />
        <span class="pager-status">Page {{ page }} of {{ pageCount }}</span>
        <Button label="Next" size="small" severity="secondary" outlined :disabled="page >= pageCount"
          @click="changePage(1)" />
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import Box from '@primeicons/vue/box'
import Code from '@primeicons/vue/code'
import Folder from '@primeicons/vue/folder'
import Language from '@primeicons/vue/language'
import ThLarge from '@primeicons/vue/th-large'
import Users from '@primeicons/vue/users'
import { catalogKindLabel } from '~/composables/useCatalogCommand'

// 公开搜索页：命令面板只负责快速跳转，这里负责完整结果和翻页
type SearchType = 'all' | 'snippets' | 'groups' | 'users' | 'languages' | 'dependencies'
type DependencyKind = 'all' | 'framework' | 'library' | 'tool' | 'runtime'

interface SearchItem {
  key: string
  title: string
  subtitle: string
  to: string
  logo: string | null
  kindLabel: string
}

interface SearchSection {
  type: Exclude<SearchType, 'all'>
  title: string
  total: number
  items: SearchItem[]
  moreTo?: string
}

const TABS: { value: SearchType, label: string, icon: Component }[] = [
  { value: 'all', label: 'All', icon: ThLarge },
  { value: 'snippets', label: 'Snippets', icon: Code },
  { value: 'groups', label: 'Groups', icon: Folder },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'languages', label: 'Languages', icon: Language },
  { value: 'dependencies', label: 'Dependencies', icon: Box }
]
const PAGE_SIZE = 20
const ALL_PAGE_SIZE = 5
const DEPENDENCY_KINDS: DependencyKind[] = ['all', 'framework', 'library', 'tool', 'runtime']
const DEPENDENCY_FILTERS: { value: DependencyKind, label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'framework', label: 'Frameworks' },
  { value: 'library', label: 'Libraries' },
  { value: 'tool', label: 'Tools' },
  { value: 'runtime', label: 'Runtimes' }
]

const route = useRoute()
const router = useRouter()

const query = ref(readQuery(route.query.q))
const type = ref<SearchType>(readType(route.query.type))
const page = ref(readPage(route.query.page))
const dependencyKind = ref<DependencyKind>(readDependencyKind(route.query.kind))
const sections = ref<SearchSection[]>([])
const loading = ref(!!query.value.trim())
const error = ref('')
let requestSeq = 0

const term = computed(() => query.value.trim())
const pageCount = computed(() => Math.max(1, Math.ceil((sections.value[0]?.total ?? 0) / PAGE_SIZE)))
const showPager = computed(() => type.value !== 'all' && (sections.value[0]?.total ?? 0) > PAGE_SIZE)

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || '?'
}

function readQuery(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function readType(value: unknown): SearchType {
  const raw = Array.isArray(value) ? value[0] : value
  return TABS.some(tab => tab.value === raw) ? raw as SearchType : 'all'
}

function readPage(value: unknown) {
  const parsed = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
}

function readDependencyKind(value: unknown): DependencyKind {
  const raw = Array.isArray(value) ? value[0] : value
  return DEPENDENCY_KINDS.includes(raw as DependencyKind) ? raw as DependencyKind : 'all'
}

function resultTo(type: Exclude<SearchType, 'all'>, q: string) {
  const params = new URLSearchParams({ type, q })
  return `/search?${params.toString()}`
}

function syncUrl() {
  const next: Record<string, string> = {}
  if (term.value) next.q = term.value
  if (type.value !== 'all') next.type = type.value
  if (type.value === 'dependencies' && dependencyKind.value !== 'all') next.kind = dependencyKind.value
  if (type.value !== 'all' && page.value > 1) next.page = String(page.value)
  void router.replace({ path: '/search', query: next })
}

function selectType(next: SearchType) {
  if (type.value === next) return
  type.value = next
  page.value = 1
  dependencyKind.value = 'all'
}

function selectDependencyKind(next: DependencyKind) {
  dependencyKind.value = next
  page.value = 1
}

function changePage(delta: number) {
  page.value = Math.min(Math.max(1, page.value + delta), pageCount.value)
}

async function fetchSections(): Promise<SearchSection[]> {
  const q = term.value
  const currentType = type.value
  if (!q) return []

  if (currentType === 'all') {
    const [snippets, groups, users, languages, dependencies] = await Promise.all([
      $fetch<{ snippets: { slug: string, name: string, intro: string, author: { username: string }, language: string | null, logoUrl: string | null }[], total: number }>(
        '/api/snippets/search', { query: { q, limit: ALL_PAGE_SIZE } }),
      $fetch<{ groups: { slug: string, name: string, author: { username: string }, snippetCount: number }[], total: number }>(
        '/api/groups/search', { query: { q, limit: ALL_PAGE_SIZE } }),
      $fetch<{ users: { username: string, nickname: string, avatarUrl: string | null }[], total: number }>(
        '/api/users/search', { query: { q, limit: ALL_PAGE_SIZE } }),
      $fetch<{ items: { slug: string, name: string, logo_url: string | null, kind: string, to: string }[], total: number }>(
        '/api/catalog/lookup', { query: { kind: 'language', q, limit: ALL_PAGE_SIZE } }),
      $fetch<{ items: { slug: string, name: string, logo_url: string | null, kind: string, to: string }[], total: number }>(
        '/api/catalog/lookup', { query: { kind: 'all', q, limit: ALL_PAGE_SIZE } })
    ])

    return [
      {
        type: 'snippets',
        title: 'Snippets',
        total: snippets.total,
        items: snippets.snippets.map(item => ({
          key: `snippet:${item.author.username}/${item.slug}`,
          title: item.name,
          subtitle: `@${item.author.username}${item.language ? ` · ${item.language}` : ''}`,
          to: `/${item.author.username}/${item.slug}`,
          logo: item.logoUrl,
          kindLabel: 'Snippet'
        })),
        moreTo: snippets.total > snippets.snippets.length ? resultTo('snippets', q) : undefined
      },
      {
        type: 'groups',
        title: 'Groups',
        total: groups.total,
        items: groups.groups.map(item => ({
          key: `group:${item.author.username}/${item.slug}`,
          title: item.name,
          subtitle: `@${item.author.username} · ${item.snippetCount} snippets`,
          to: `/${item.author.username}/${item.slug}`,
          logo: null,
          kindLabel: 'Group'
        })),
        moreTo: groups.total > groups.groups.length ? resultTo('groups', q) : undefined
      },
      {
        type: 'users',
        title: 'Users',
        total: users.total,
        items: users.users.map(item => ({
          key: `user:${item.username}`,
          title: item.nickname || item.username,
          subtitle: `@${item.username}`,
          to: `/${item.username}`,
          logo: item.avatarUrl,
          kindLabel: 'User'
        })),
        moreTo: users.total > users.users.length ? resultTo('users', q) : undefined
      },
      {
        type: 'languages',
        title: 'Languages',
        total: languages.total,
        items: languages.items.map(item => ({
          key: `language:${item.slug}`,
          title: item.name,
          subtitle: 'Programming language',
          to: item.to,
          logo: item.logo_url,
          kindLabel: 'Language'
        })),
        moreTo: languages.total > languages.items.length ? resultTo('languages', q) : undefined
      },
      {
        type: 'dependencies',
        title: 'Dependencies',
        total: dependencies.total,
        items: dependencies.items.map(item => ({
          key: `dependency:${item.kind}/${item.slug}`,
          title: item.name,
          subtitle: catalogKindLabel(item.kind),
          to: item.to,
          logo: item.logo_url,
          kindLabel: ''
        })),
        moreTo: dependencies.total > dependencies.items.length ? resultTo('dependencies', q) : undefined
      }
    ].filter(section => section.items.length > 0)
  }

  const query = { q, limit: PAGE_SIZE, offset: (page.value - 1) * PAGE_SIZE }

  if (currentType === 'snippets') {
    const data = await $fetch<{ snippets: { slug: string, name: string, author: { username: string }, language: string | null, logoUrl: string | null }[], total: number }>(
      '/api/snippets/search', { query })
    return [{
      type: 'snippets',
      title: 'Snippets',
      total: data.total,
      items: data.snippets.map(item => ({
        key: `snippet:${item.author.username}/${item.slug}`,
        title: item.name,
        subtitle: `@${item.author.username}${item.language ? ` · ${item.language}` : ''}`,
        to: `/${item.author.username}/${item.slug}`,
        logo: item.logoUrl,
        kindLabel: 'Snippet'
      }))
    }]
  }

  if (currentType === 'groups') {
    const data = await $fetch<{ groups: { slug: string, name: string, author: { username: string }, snippetCount: number }[], total: number }>(
      '/api/groups/search', { query })
    return [{
      type: 'groups',
      title: 'Groups',
      total: data.total,
      items: data.groups.map(item => ({
        key: `group:${item.author.username}/${item.slug}`,
        title: item.name,
        subtitle: `@${item.author.username} · ${item.snippetCount} snippets`,
        to: `/${item.author.username}/${item.slug}`,
        logo: null,
        kindLabel: 'Group'
      }))
    }]
  }

  if (currentType === 'users') {
    const data = await $fetch<{ users: { username: string, nickname: string, avatarUrl: string | null }[], total: number }>(
      '/api/users/search', { query })
    return [{
      type: 'users',
      title: 'Users',
      total: data.total,
      items: data.users.map(item => ({
        key: `user:${item.username}`,
        title: item.nickname || item.username,
        subtitle: `@${item.username}`,
        to: `/${item.username}`,
        logo: item.avatarUrl,
        kindLabel: 'User'
      }))
    }]
  }

  const catalogKind = currentType === 'languages'
    ? 'language'
    : (dependencyKind.value === 'all' ? 'all' : dependencyKind.value)
  const data = await $fetch<{ items: { slug: string, name: string, logo_url: string | null, kind: string, to: string }[], total: number }>(
    '/api/catalog/lookup', { query: { kind: catalogKind, q, limit: PAGE_SIZE, offset: (page.value - 1) * PAGE_SIZE } })
  return [{
    type: currentType,
    title: currentType === 'languages' ? 'Languages' : 'Dependencies',
    total: data.total,
    items: data.items.map(item => ({
      key: `${item.kind}:${item.slug}`,
      title: item.name,
      subtitle: currentType === 'languages' ? 'Programming language' : catalogKindLabel(item.kind),
      to: item.to,
      logo: item.logo_url,
      kindLabel: currentType === 'languages' ? 'Language' : ''
    }))
  }]
}

async function load() {
  const seq = ++requestSeq
  error.value = ''
  if (!term.value) {
    sections.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    const next = await fetchSections()
    if (seq !== requestSeq) return
    sections.value = next

    // 直接访问超范围 page 时回到最后一页
    if (type.value !== 'all' && next[0]) {
      const maxPage = Math.max(1, Math.ceil(next[0].total / PAGE_SIZE))
      if (page.value > maxPage) {
        page.value = maxPage
        return
      }
    }
  } catch {
    if (seq !== requestSeq) return
    sections.value = []
    error.value = 'Search failed. Please try again.'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const debouncedLoad = debounce(() => {
  page.value = 1
  syncUrl()
  void load()
}, 300)

watch(query, () => {
  debouncedLoad.run()
})

watch([type, page, dependencyKind], () => {
  syncUrl()
  void load()
})

// 浏览器前进/后退时同步输入框和分页状态
watch(() => route.fullPath, () => {
  if (route.path !== '/search') return
  const nextQuery = readQuery(route.query.q)
  const nextType = readType(route.query.type)
  const nextPage = readPage(route.query.page)
  const nextKind = readDependencyKind(route.query.kind)
  if (nextQuery !== query.value) query.value = nextQuery
  if (nextType !== type.value) type.value = nextType
  if (nextPage !== page.value) page.value = nextPage
  if (nextKind !== dependencyKind.value) dependencyKind.value = nextKind
})

function runNow() {
  debouncedLoad.cancel()
  page.value = 1
  syncUrl()
  void load()
}

onMounted(() => {
  if (term.value) void load()
})

onBeforeUnmount(() => {
  debouncedLoad.cancel()
})

useHead({
  title: 'Search',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
.search-page {
  width: min(1000px, 90vw);
  margin: 0 auto;
  padding: 3.5rem 0 5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.search-title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.search-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.search-form {
  display: flex;
  gap: 0.6rem;

  :deep(.p-inputtext) {
    flex: 1;
  }
}

.search-tabs {
  display: flex;
  gap: 0.2rem;
  border-bottom: 1px solid var(--p-content-border-color);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.search-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem 0.5rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  cursor: pointer;

  svg {
    width: 0.95em;
    height: 0.95em;
  }

  &:hover {
    color: var(--p-text-color);
  }

  &.is-active {
    border-bottom-color: var(--p-primary-color);
    color: var(--p-text-color);
    font-weight: 600;
  }
}

.dependency-filter {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);

  label {
    white-space: nowrap;
  }

  :deep(.p-select) {
    min-width: 9rem;
  }
}

@media (max-width: 480px) {
  .dependency-filter {
    label {
      display: none;
    }

    :deep(.p-select) {
      min-width: 8rem;
    }
  }
}

.search-hint,
.search-status {
  margin: 0;
  font-size: 0.88rem;
  color: var(--p-text-muted-color);
}

.search-status--error {
  color: var(--p-red-500, #ef4444);
}

.search-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.section-head-main {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.section-count {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.result-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.5rem;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.7rem;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: color-mix(in srgb, var(--p-text-color) 25%, var(--p-content-border-color));
    background: var(--p-content-hover-background);
  }
}

.result-logo {
  flex: none;
  width: 28px;
  height: 28px;
  object-fit: contain;

  &--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--p-text-color) 8%, transparent);
    font-size: 0.8rem;
    font-weight: 600;
  }
}

.result-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.result-title,
.result-sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-title {
  font-size: 0.88rem;
  font-weight: 600;
}

.result-sub {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.result-kind {
  flex: none;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}

.section-more {
  align-self: flex-start;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: var(--p-text-color);
  }
}

.search-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
}

.pager-status {
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 560px) {
  .search-form {
    flex-direction: column;
  }
}
</style>
