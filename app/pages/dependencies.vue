<template>
  <div class="catalog">
    <header class="page-head">
      <h1 class="page-title">Dependencies</h1>
      <NuxtLink to="/request?kind=dependency" class="page-action">Request a new dependency</NuxtLink>
    </header>

    <CatalogSearch placeholder="Search frameworks, libraries, tools and runtimes" scope="dependencies">
      <nav class="filter-tabs" aria-label="Filter dependencies by type">
        <button v-for="filter in FILTERS" :key="filter.value" type="button" class="filter-tab"
          :class="{ 'is-active': activeKind === filter.value }" :aria-pressed="activeKind === filter.value"
          @click="activeKind = filter.value">
          {{ filter.label }}
        </button>
      </nav>

      <!-- 语言（按名称排序，可跳转到该语言介绍页） -->
      <section v-for="group in groups" :key="group.language.slug" class="language-group">
        <SectionRule :label="group.language.name" :to="`/language/${group.language.slug}`" variant="title" />

        <!-- 语言下的条目按类型分节，节内按名称排序 -->
        <div v-for="kindGroup in group.kinds" :key="kindGroup.kind" class="kind-group">
          <SectionRule :label="kindGroup.label" :hint="kindGroup.hint" variant="kind" />
          <div class="tiles">
            <CatalogTile v-for="item in kindGroup.items" :key="`${item.kind}-${item.slug}`"
              :to="`/${item.kind}/${item.slug}`" :name="item.name" :logo_url="item.logo_url" />
          </div>
        </div>
      </section>

      <p v-if="!groups.length" class="filter-empty">No {{ activeKindLabel }} found.</p>
    </CatalogSearch>
  </div>
</template>

<script setup lang="ts">
import {
  DEPENDENCY_KIND_LABELS,
  DEPENDENCY_KIND_ORDER,
  type DependencyKind
} from '~/composables/useCatalogEntry'

interface EntryItem {
  slug: string
  name: string
  kind: DependencyKind
  logo_url: string | null
  total: number
  language: { slug: string; name: string; logo_url: string | null }
}

const { data } = await useFetch<{ entries: EntryItem[] }>('/api/dependencies')

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })

type KindFilter = 'all' | DependencyKind
const FILTERS: { value: KindFilter, label: string }[] = [
  { value: 'all', label: 'All' },
  ...DEPENDENCY_KIND_ORDER.map(kind => ({ value: kind, label: DEPENDENCY_KIND_LABELS[kind].many }))
]
const activeKind = ref<KindFilter>('all')
const activeKindLabel = computed(() =>
  activeKind.value === 'all' ? 'dependencies' : DEPENDENCY_KIND_LABELS[activeKind.value].many.toLowerCase())

// 语言 → 类型 → 条目（语言按名称排序；条目可适用多种语言，因此在多个语言下各出现一次）
// 每个「语言 × 类型」由接口截断，超出上限的用 "+N more" 提示
const groups = computed(() => {
  const languages = new Map<string, { language: EntryItem['language']; kinds: Map<DependencyKind, EntryItem[]> }>()

  for (const entry of data.value?.entries ?? []) {
    if (!languages.has(entry.language.slug)) {
      languages.set(entry.language.slug, { language: entry.language, kinds: new Map() })
    }

    const kinds = languages.get(entry.language.slug)!.kinds
    if (!kinds.has(entry.kind)) kinds.set(entry.kind, [])
    kinds.get(entry.kind)!.push(entry)
  }

  return [...languages.values()]
    .sort((a, b) => byName(a.language, b.language))
    .map(group => ({
      language: group.language,
      kinds: DEPENDENCY_KIND_ORDER
        .filter(kind => activeKind.value === 'all' || kind === activeKind.value)
        .filter(kind => group.kinds.has(kind))
        .map(kind => {
          const items = [...group.kinds.get(kind)!].sort(byName)
          const total = items[0]?.total ?? items.length
          return {
            kind,
            label: DEPENDENCY_KIND_LABELS[kind].many,
            items,
            hint: total > items.length ? `+${total - items.length} more` : ''
          }
        })
    }))
    .filter(group => group.kinds.length > 0)
})

useHead({ title: 'Dependencies' })
useSeoMeta({ description: 'Frameworks, libraries, tools and runtimes on BITS, grouped by language.' })
</script>

<style lang="scss" scoped>
.catalog {
  width: min(1100px, 90vw);
  margin: 0 auto;
  padding: 3.5rem 0 5rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.page-action {
  flex-shrink: 0;
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  color: var(--p-text-color);
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover {
    background: var(--p-content-hover-background);
    border-color: var(--p-text-muted-color);
  }
}

.page-title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.filter-tabs {
  display: flex;
  gap: 0.2rem;
  border-bottom: 1px solid var(--p-content-border-color);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-tab {
  padding: 0.55rem 0.75rem 0.5rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--p-text-muted-color);
  font: inherit;
  font-size: 0.86rem;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: var(--p-text-color);
  }

  &.is-active {
    border-bottom-color: var(--p-primary-color);
    color: var(--p-text-color);
    font-weight: 600;
  }
}

.filter-empty {
  margin: 0;
  font-size: 0.88rem;
  color: var(--p-text-muted-color);
}

.language-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.kind-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tiles {
  /* 固定列宽、左对齐排布（与手稿一致：条目成行向左堆叠，右侧留白） */
  display: grid;
  grid-template-columns: repeat(auto-fill, 104px);
  gap: 0.5rem 0.75rem;
}
</style>
