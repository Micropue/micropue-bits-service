<template>
  <div class="search">
    <div class="search-field">
      <InputText v-model="query" fluid class="search-input" :placeholder="placeholder" aria-label="Search the catalog"
        autocomplete="off" spellcheck="false" enterkeyhint="search" />

      <!-- 清空用独立的 Button（图标按钮点击区域 2.5rem），原生 search 的取消按钮太小 -->
      <Button v-if="term" severity="secondary" text rounded class="search-clear" aria-label="Clear search"
        @click="clear">
        <template #icon>
          <Times :size="16" aria-hidden="true" />
        </template>
      </Button>
    </div>

    <template v-if="searching">
      <p class="status" role="status" aria-live="polite">{{ statusText }}</p>

      <div v-if="results.length" class="tiles">
        <CatalogTile v-for="item in results" :key="item.to" :to="item.to" :name="item.name" :logo_url="item.logo_url"
          :note="item.note" />
      </div>
    </template>

    <!-- 未检索时展示页面自己的清单 -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import Times from '@primeicons/vue/times'

// 目录自动检索：输入即查（无按钮）。
// 防抖：停止输入 300ms 才发请求；节流：两次请求至少间隔 300ms；
// 竞态：新的输入会中止在途请求，且过期响应一律丢弃。
// scope 限定检索范围：语言页只搜语言、依赖页只搜依赖
const props = withDefaults(defineProps<{ placeholder?: string; scope?: 'languages' | 'dependencies' }>(), {
  placeholder: 'Search the catalog'
})

interface ApiResult {
  kind: string
  slug: string
  name: string
  logo_url: string | null
}

interface SearchResult {
  to: string
  name: string
  logo_url: string | null
  note: string
}

const KIND_NOTES: Record<string, string> = {
  language: 'Language',
  framework: 'Framework',
  library: 'Library',
  tool: 'Tool',
  runtime: 'Runtime'
}

const DEBOUNCE_MS = 300
const MIN_INTERVAL_MS = 300

const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)

const term = computed(() => query.value.trim())
const searching = computed(() => term.value.length > 0)
const statusText = computed(() => {
  if (loading.value) return 'Searching…'
  if (!results.value.length) return 'No match'
  return `${results.value.length} result${results.value.length > 1 ? 's' : ''}`
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let controller: AbortController | null = null
let lastRequestAt = 0

async function run(current: string) {
  // 节流：距上次请求不足最小间隔时先等一等
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
  if (current !== term.value) return

  controller?.abort()
  controller = new AbortController()
  lastRequestAt = Date.now()
  loading.value = true

  try {
    const res = await $fetch<{ results: ApiResult[] }>('/api/search', {
      params: { q: current, scope: props.scope },
      signal: controller.signal
    })
    if (current !== term.value) return
    results.value = res.results.map(item => ({
      to: item.kind === 'language' ? `/language/${item.slug}` : `/${item.kind}/${item.slug}`,
      name: item.name,
      logo_url: item.logo_url,
      // 语言页结果全是语言，不必再标注类型
      note: props.scope === 'languages' ? '' : (KIND_NOTES[item.kind] ?? item.kind)
    }))
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') return
    results.value = []
  } finally {
    if (current === term.value) loading.value = false
  }
}

watch(term, value => {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (!value) {
    controller?.abort()
    results.value = []
    loading.value = false
    return
  }

  debounceTimer = setTimeout(() => run(value), DEBOUNCE_MS)
})

// 清空按钮：交给 watch(term) 收尾（中止在途请求、复位结果、切回清单）
function clear() {
  query.value = ''
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  controller?.abort()
})
</script>

<style lang="scss" scoped>
.search {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-field {
  position: relative;
}

/* 输入框比清空按钮略高：hover 时的圆形底不会超出输入框 */
.search-input {
  min-height: 2.875rem;
  padding-right: 3.25rem;
}

.search-clear {
  position: absolute;
  top: 50%;
  right: 0.4rem;
  transform: translateY(-50%);
}

.status {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.tiles {
  /* 与索引页清单一致：固定列宽、左对齐排布 */
  display: grid;
  grid-template-columns: repeat(auto-fill, 104px);
  gap: 0.5rem 0.75rem;
}
</style>
