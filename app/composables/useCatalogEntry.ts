import type { Ref } from 'vue'

// 目录项（编程语言 / 框架 / 库 / 工具 / 运行时）展示页共用的数据形状
export interface CatalogEntryData {
  slug: string
  name: string
  intro: string
  logo_url: string | null
  link_url: string | null
}

// 语言页列出的目录条目（用于互相关联；total 为该「语言 × 类型」的总数，用于 "+N more"）
export interface CatalogItemData {
  slug: string
  name: string
  kind: DependencyKind
  logo_url: string | null
  total?: number
}

export type DependencyKind = 'framework' | 'library' | 'tool' | 'runtime'

// 关联区块：若干分组，每组一组可点击的条目
// total 大于 items.length 时表示清单被截断，页面提示 "+N more"
export interface CatalogRelatedGroup {
  label: string
  items: { to: string; name: string; logo_url: string | null }[]
  total?: number
}

export const DEPENDENCY_KIND_LABELS: Record<DependencyKind, { one: string; many: string }> = {
  framework: { one: 'Framework', many: 'Frameworks' },
  library: { one: 'Library', many: 'Libraries' },
  tool: { one: 'Tool', many: 'Tools' },
  runtime: { one: 'Runtime', many: 'Runtimes' }
}

export const DEPENDENCY_KIND_ORDER: DependencyKind[] = ['framework', 'library', 'tool', 'runtime']

// 目录项页面的标题与描述（站点标题后缀「| BITS」由 app.vue 的 titleTemplate 追加）
// 必须在页面 setup 里同步调用（useHead 依赖 Nuxt 实例上下文）
export function useCatalogHead(entry: Ref<CatalogEntryData | null>) {
  useHead({ title: computed(() => entry.value?.name ?? 'Not Found') })
  useSeoMeta({ description: () => entry.value?.intro })
}

// /{kind}/{slug} 页面取数：目录里不存在、或类型与路径不符，一律按 404 处理
// related 为「适用语言」回链分组（多语言，主语言在最前）
export async function useDependencyEntry(kind: DependencyKind) {
  const route = useRoute()
  const { data } = await useFetch<{
    dependency: CatalogEntryData & { kind: DependencyKind }
    languages: { slug: string; name: string; logo_url: string | null }[]
  }>(() => `/api/dependencies/${route.params.slug}`)

  const entry = computed(() => data.value?.dependency ?? null)
  const label = DEPENDENCY_KIND_LABELS[kind].one

  if (!entry.value || entry.value.kind !== kind) {
    throw createError({ statusCode: 404, statusMessage: `${label} not found` })
  }

  const related = computed<CatalogRelatedGroup[]>(() => {
    const languages = data.value?.languages ?? []
    if (!languages.length) return []
    return [{
      label: 'Languages',
      items: languages.map(language => ({
        to: `/language/${language.slug}`,
        name: language.name,
        logo_url: language.logo_url
      }))
    }]
  })

  return { entry, label, related }
}
