<template>
  <div class="ov-grid">
    <section v-for="block in blocks" :key="block.label" class="dash-card ov-block">
      <span class="ov-icon">
        <component :is="block.icon" aria-hidden="true" />
      </span>
      <span class="ov-value">{{ block.value }}</span>
      <span class="ov-label">{{ block.label }}</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import Code from '@primeicons/vue/code'
import Copy from '@primeicons/vue/copy'
import Database from '@primeicons/vue/database'
import Folder from '@primeicons/vue/folder'
import Users from '@primeicons/vue/users'

// 主页：块式概览。只放站点规模数据，不放认证开关与账号信息
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, restoreLocale } = useConsoleI18n()

interface Stats {
  users: number
  languages: number
  dependencies: number
  snippets: number
  groups: number
}

const { data } = await useFetch<Stats>('/api/dashboard/stats')

const formatter = new Intl.NumberFormat('en')
const format = (value?: number) => (value == null ? '—' : formatter.format(value))

// 有效内容：未软删除的代码段 / 分组（已删除的可在内容管理里恢复）
const blocks = computed(() => [
  { label: t('home.users'), value: format(data.value?.users), icon: Users },
  { label: t('home.languages'), value: format(data.value?.languages), icon: Code },
  { label: t('home.snippets'), value: format(data.value?.snippets), icon: Copy },
  { label: t('home.snippetGroups'), value: format(data.value?.groups), icon: Folder },
  { label: t('home.dependencies'), value: format(data.value?.dependencies), icon: Database }
])

// 语言存 localStorage：整页刷新后由布局恢复，主页单独打开时也兜一次
onMounted(restoreLocale)

useHead({
  title: () => t('title.overview'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  align-items: start;
}

.ov-block {
  align-items: flex-start;
  gap: 0.45rem;
  padding: 1.35rem 1.4rem;
}

.ov-icon {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  margin-bottom: 0.35rem;
  border-radius: 10px;
  background: var(--dash-active);
  color: var(--p-text-muted-color);

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }
}

.ov-value {
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.ov-label {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}
</style>
