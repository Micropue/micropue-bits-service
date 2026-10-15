<template>
  <div class="catalog">
    <h1 class="page-title">Languages</h1>

    <CatalogSearch placeholder="Search languages" scope="languages">
      <section v-for="group in groups" :key="group.initial" class="group">
        <SectionRule :label="group.initial" :hint="group.hint" variant="letter" />
        <div class="tiles">
          <CatalogTile v-for="item in group.items" :key="item.slug" :to="`/language/${item.slug}`" :name="item.name"
            :logo_url="item.logo_url" />
        </div>
      </section>
    </CatalogSearch>
  </div>
</template>

<script setup lang="ts">
interface LanguageRow {
  slug: string
  name: string
  logo_url: string | null
  initial: string
  total: number
}

const { data } = await useFetch<{ languages: LanguageRow[] }>('/api/languages')

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })

// 首字母分组（字母与组内总数来自接口），组内按名称排序；超出上限的用 "+N more" 提示
const groups = computed(() => {
  const map = new Map<string, { total: number; items: LanguageRow[] }>()

  for (const row of data.value?.languages ?? []) {
    if (!map.has(row.initial)) map.set(row.initial, { total: row.total, items: [] })
    map.get(row.initial)!.items.push(row)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([initial, group]) => ({
      initial,
      items: [...group.items].sort(byName),
      hint: group.total > group.items.length ? `+${group.total - group.items.length} more` : ''
    }))
})

useHead({ title: 'Languages' })
useSeoMeta({ description: 'Every programming language on BITS, with logos and official links.' })
</script>

<style lang="scss" scoped>
.catalog {
  width: min(1100px, 90vw);
  margin: 0 auto;
  padding: 3.5rem 0 5rem;
  display: flex;
  flex-direction: column;
  gap: 2.75rem;
}

.page-title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.tiles {
  /* 固定列宽、左对齐排布（与手稿一致：条目成行向左堆叠，右侧留白） */
  display: grid;
  grid-template-columns: repeat(auto-fill, 104px);
  gap: 0.5rem 0.75rem;
}
</style>
