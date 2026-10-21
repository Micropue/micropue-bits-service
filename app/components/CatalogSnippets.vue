<template>
  <section class="catalog-content" aria-labelledby="catalog-content-title">
    <header class="catalog-head">
      <div>
        <h2 id="catalog-content-title" class="catalog-title">Using {{ subject }}</h2>
        <p class="catalog-sub">{{ plural(snippetTotal, 'snippet') }} · {{ plural(groupTotal, 'group') }}</p>
      </div>
      <InputText v-model="search" class="catalog-search" name="catalog-search" autocomplete="off"
        placeholder="Search snippets and groups" aria-label="Search snippets and groups" />
    </header>

    <div class="catalog-tabs" role="tablist" aria-label="Content type">
      <button type="button" class="catalog-tab" :class="{ 'is-active': tab === 'snippets' }" role="tab"
        :aria-selected="tab === 'snippets'" @click="tab = 'snippets'">
        Snippets <span>{{ snippetTotal }}</span>
      </button>
      <button type="button" class="catalog-tab" :class="{ 'is-active': tab === 'groups' }" role="tab"
        :aria-selected="tab === 'groups'" @click="tab = 'groups'">
        Groups <span>{{ groupTotal }}</span>
      </button>
    </div>

    <template v-if="tab === 'snippets'">
      <p v-if="snippetLoading && !snippetItems.length" class="catalog-state">Loading…</p>
      <p v-else-if="!snippetItems.length" class="catalog-state">
        {{ search.trim() ? 'No snippets match this search.' : 'No public snippets yet.' }}
      </p>
      <div v-else class="catalog-grid">
        <NuxtLink v-for="item in snippetItems" :key="`${item.author.username}/${item.slug}`"
          :to="`/${item.author.username}/${item.slug}`" class="catalog-card">
          <div class="catalog-card-head">
            <span class="catalog-lang">
              <img v-if="item.language?.logo_url" class="catalog-logo" :src="item.language.logo_url" alt=""
                width="14" height="14" loading="lazy">
              {{ item.language?.name ?? 'Snippet' }}
            </span>
            <span class="catalog-date">{{ formatDate(item.updatedAt) }}</span>
          </div>
          <h3 class="catalog-name">{{ item.name }}</h3>
          <p v-if="item.intro" class="catalog-intro">{{ item.intro }}</p>
          <div class="catalog-footer">
            <span class="catalog-author">@{{ item.author.username }}</span>
            <span v-for="tag in item.tags.slice(0, 3)" :key="tag.key" class="catalog-tag">{{ tag.name }}</span>
          </div>
        </NuxtLink>
      </div>
      <div v-if="snippetItems.length < snippetTotal" class="catalog-more">
        <Button label="Load more" severity="secondary" outlined size="small" :loading="snippetLoading"
          @click="loadSnippets(false)" />
      </div>
    </template>

    <template v-else>
      <p v-if="groupLoading && !groupItems.length" class="catalog-state">Loading…</p>
      <p v-else-if="!groupItems.length" class="catalog-state">
        {{ search.trim() ? 'No groups match this search.' : 'No public groups use this yet.' }}
      </p>
      <div v-else class="catalog-grid">
        <NuxtLink v-for="group in groupItems" :key="`${group.author.username}/${group.slug}`"
          :to="`/${group.author.username}/${group.slug}`" class="catalog-card">
          <div class="catalog-card-head">
            <span class="catalog-lang">
              <FolderIcon class="catalog-group-icon" aria-hidden="true" />
              {{ plural(group.snippetCount, 'snippet') }}
            </span>
            <span class="catalog-date">{{ formatDate(group.updatedAt) }}</span>
          </div>
          <h3 class="catalog-name">{{ group.name }}</h3>
          <p v-if="group.intro" class="catalog-intro">{{ group.intro }}</p>
          <div class="catalog-footer">
            <span class="catalog-author">@{{ group.author.username }}</span>
            <span v-for="tag in group.tags.slice(0, 3)" :key="tag.key" class="catalog-tag">{{ tag.name }}</span>
          </div>
        </NuxtLink>
      </div>
      <div v-if="groupItems.length < groupTotal" class="catalog-more">
        <Button label="Load more" severity="secondary" outlined size="small" :loading="groupLoading"
          @click="loadGroups(false)" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import FolderIcon from '@primeicons/vue/folder'

// 目录详情页下方：引用该语言 / 依赖的公开代码段与分组，支持搜索、切换与懒加载
interface CatalogSnippetItem {
  slug: string
  name: string
  intro: string
  updatedAt: string
  author: { username: string, nickname: string, avatarUrl: string | null }
  language: { slug: string, name: string, logo_url: string | null } | null
  tags: { key: string, name: string }[]
}

interface CatalogGroupItem {
  slug: string
  name: string
  intro: string
  updatedAt: string
  snippetCount: number
  author: { username: string, nickname: string, avatarUrl: string | null }
  tags: { key: string, name: string }[]
}

const props = defineProps<{
  language?: string
  dependency?: string
  subject: string
}>()

const PAGE_SIZE = 12
const tab = ref<'snippets' | 'groups'>('snippets')
const search = ref('')

const snippetItems = ref<CatalogSnippetItem[]>([])
const snippetTotal = ref(0)
const snippetLoading = ref(false)
const groupItems = ref<CatalogGroupItem[]>([])
const groupTotal = ref(0)
const groupLoading = ref(false)

let snippetSeq = 0
let groupSeq = 0

async function loadSnippets(reset: boolean) {
  const seq = ++snippetSeq
  const offset = reset ? 0 : snippetItems.value.length
  snippetLoading.value = true
  try {
    const data = await $fetch<{ items: CatalogSnippetItem[], total: number }>('/api/snippets/by-catalog', {
      query: {
        language: props.language,
        dependency: props.dependency,
        q: search.value.trim(),
        limit: PAGE_SIZE,
        offset
      }
    })
    if (seq !== snippetSeq) return
    snippetItems.value = reset ? data.items : [...snippetItems.value, ...data.items]
    snippetTotal.value = data.total
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
    const data = await $fetch<{ items: CatalogGroupItem[], total: number }>('/api/groups/by-catalog', {
      query: {
        language: props.language,
        dependency: props.dependency,
        q: search.value.trim(),
        limit: PAGE_SIZE,
        offset
      }
    })
    if (seq !== groupSeq) return
    groupItems.value = reset ? data.items : [...groupItems.value, ...data.items]
    groupTotal.value = data.total
  } catch {
    if (seq === groupSeq && reset) {
      groupItems.value = []
      groupTotal.value = 0
    }
  } finally {
    if (seq === groupSeq) groupLoading.value = false
  }
}

// 搜索同时作用于两个 Tab，切换 Tab 不再重复请求
const debouncedLoad = debounce(() => {
  void loadSnippets(true)
  void loadGroups(true)
}, 250)

watch(search, () => debouncedLoad.run())

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

onMounted(() => {
  void loadSnippets(true)
  void loadGroups(true)
})

onBeforeUnmount(() => debouncedLoad.cancel())
</script>

<style scoped lang="scss">
.catalog-content {
  width: 100%;
  margin: 0;
  padding: 0;
}

.catalog-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 0.9rem;
}

.catalog-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.catalog-sub {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.catalog-search {
  width: 17rem;
  max-width: 45vw;
}

.catalog-tabs {
  display: flex;
  gap: 0.25rem;
  margin: 0 0 1rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.catalog-tab {
  padding: 0.45rem 0.7rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--p-text-muted-color);
  font: inherit;
  font-size: 0.88rem;
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

.catalog-state {
  margin: 0;
  padding: 1.25rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 0.9rem;
  font-size: 0.88rem;
  color: var(--p-text-muted-color);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9rem;
}

.catalog-card {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.05rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.9rem;
  background: var(--p-content-background);
  color: inherit;
  text-decoration: none;

  &:hover .catalog-name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.catalog-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.catalog-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.catalog-logo {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: var(--logo-tint);
}

.catalog-group-icon {
  width: 0.9rem;
  height: 0.9rem;
  opacity: 0.7;
}

.catalog-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.catalog-intro {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--p-text-muted-color);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.catalog-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.3rem;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.catalog-author {
  margin-right: 0.2rem;
}

.catalog-tag {
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
}

.catalog-more {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

@media (max-width: 700px) {
  .catalog-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .catalog-search {
    width: 100%;
    max-width: none;
  }
}
</style>
