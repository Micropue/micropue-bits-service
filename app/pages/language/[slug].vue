<template>
  <CatalogEntry :entry="entry" label="Programming Language" :related="related" />
</template>

<script setup lang="ts">
import {
  DEPENDENCY_KIND_LABELS,
  DEPENDENCY_KIND_ORDER,
  type CatalogEntryData,
  type CatalogItemData,
  type CatalogRelatedGroup
} from '~/composables/useCatalogEntry'

const route = useRoute()
// 响应式地址：从 /language/a 切到 /language/b 时自动重新取数
const { data } = await useFetch<{ language: CatalogEntryData; entries: CatalogItemData[] }>(
  () => `/api/languages/${route.params.slug}`
)

const entry = computed(() => data.value?.language ?? null)
if (!entry.value) {
  throw createError({ statusCode: 404, statusMessage: 'Language not found' })
}

// 该语言名下的目录条目按类型分组（框架/库/工具/运行时），作为向下的页面关联
// 接口已按类型随机截断，这里把总数带上，超出部分提示 "+N more"
const related = computed<CatalogRelatedGroup[]>(() => {
  const entries = data.value?.entries ?? []
  return DEPENDENCY_KIND_ORDER
    .map(kind => {
      const items = entries.filter(item => item.kind === kind)
      return {
        label: DEPENDENCY_KIND_LABELS[kind].many,
        items: items.map(item => ({ to: `/${kind}/${item.slug}`, name: item.name, logo_url: item.logo_url })),
        total: items[0]?.total ?? items.length
      }
    })
    .filter(group => group.items.length > 0)
})

useCatalogHead(entry)
</script>
