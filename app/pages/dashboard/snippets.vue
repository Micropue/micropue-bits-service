<template>
  <div class="c-page">
    <header class="c-page-head">
      <div>
        <h2 class="c-page-title">{{ t('snippets.title') }}</h2>
        <p class="c-page-sub">
          {{ total === 1 ? t('snippets.subtitle', { count: total }) : t('snippets.subtitlePlural', { count: total }) }}
        </p>
        <p v-if="truncated" class="c-page-note">{{ t('snippets.truncated', { limit: LIST_LIMIT }) }}</p>
      </div>
    </header>

    <ConsoleDataTable :value="snippets" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['name', 'slug', 'owner', 'language_name', 'group_name']" @refresh="refresh">
      <template #cell-name="{ row }">
        <div class="c-cell-text">
          <span class="c-cell-title">{{ row.name }}</span>
          <span class="c-cell-sub c-mono">/{{ row.slug }}</span>
        </div>
      </template>

      <template #cell-owner="{ row }">
        <div class="c-owner">
          <UserAvatar :src="row.avatarUrl" :size="28" />
          <span class="c-cell-text">
            <span class="c-cell-title">{{ row.nickname }}</span>
            <span class="c-cell-sub">{{ row.username ? `@${row.username}` : row.email }}</span>
          </span>
        </div>
      </template>

      <template #cell-language_name="{ row }">
        <span v-if="row.language_name" class="c-lang">
          <img v-if="row.language_logo" class="c-logo" :src="row.language_logo" alt="" width="16" height="16"
            loading="lazy">
          {{ row.language_name }}
        </span>
        <span v-else class="c-muted">—</span>
      </template>

      <template #cell-visibility="{ row }">
        <StatusTag :label="t(`content.visibility.${row.visibility}`)" :status="row.visibility"
          :severity="visibilitySeverity(row.visibility)" />
      </template>

      <template #cell-status="{ row }">
        <StatusTag :label="t(`content.status.${row.status}`)" :status="row.status"
          :severity="row.status === 'deleted' ? 'danger' : 'secondary'" />
      </template>

      <template #cell-group_name="{ row }">{{ row.group_name ?? '—' }}</template>

      <template #cell-actions="{ row }">
        <div class="c-cell-actions">
          <Button :label="t('content.view')" severity="secondary" text size="small" @click="openDetail(row)" />
          <Button v-if="advanced && row.status === 'active'" :label="t('snippets.delete')" severity="danger" text size="small"
            @click="askDelete(row)" />
          <Button v-else :label="t('snippets.restore')" severity="secondary" text size="small"
            @click="askRestore(row)" />
        </div>
      </template>
    </ConsoleDataTable>
  </div>

  <!-- 详情：代码只在打开时单独拉取，列表不带大字段 -->
  <Dialog v-model:visible="detailVisible" modal :draggable="false" :style="{ width: '52rem' }"
    :header="t('snippets.detail.title')">
    <div v-if="detailLoading" class="c-detail-loading">{{ t('snippets.loading') }}</div>

    <div v-else-if="detail" class="c-detail">
      <div class="c-detail-head">
        <div>
          <h3 class="c-detail-name">{{ detail.name }}</h3>
          <p class="c-detail-sub c-mono">/{{ detail.slug }}</p>
        </div>
        <div class="c-tags">
          <StatusTag :label="t(`content.visibility.${detail.visibility}`)" :status="detail.visibility"
            :severity="visibilitySeverity(detail.visibility)" />
          <StatusTag :label="t(`content.status.${detail.status}`)" :status="detail.status"
            :severity="detail.status === 'deleted' ? 'danger' : 'secondary'" />
        </div>
      </div>

      <section class="c-detail-block">
        <div class="c-kv">
          <span class="c-k">{{ t('snippets.detail.author') }}</span>
          <span class="c-v c-owner">
            <UserAvatar :src="detail.author.avatarUrl" :size="26" />
            <span>{{ detail.author.nickname }} · {{ detail.author.username ? `@${detail.author.username}` : detail.author.email }}</span>
          </span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('snippets.detail.language') }}</span>
          <span class="c-v">{{ detail.language?.name ?? '—' }}</span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('snippets.detail.group') }}</span>
          <span class="c-v">{{ detail.group?.name ?? '—' }}</span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('snippets.detail.created') }}</span>
          <span class="c-v">{{ formatDate(detail.createdAt) }}</span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('snippets.detail.updated') }}</span>
          <span class="c-v">{{ formatDate(detail.updatedAt) }}</span>
        </div>
      </section>

      <section v-if="detail.intro" class="c-detail-block">
        <h4 class="c-detail-title">{{ t('snippets.detail.intro') }}</h4>
        <p class="c-v">{{ detail.intro }}</p>
      </section>

      <section v-if="detail.tags.length" class="c-detail-block">
        <h4 class="c-detail-title">{{ t('snippets.detail.tags') }}</h4>
        <div class="c-tags">
          <span v-for="tag in detail.tags" :key="tag.key" class="c-tag">{{ tag.name }}</span>
        </div>
      </section>

      <section v-if="detail.dependencies.length" class="c-detail-block">
        <h4 class="c-detail-title">{{ t('snippets.detail.dependencies') }}</h4>
        <div class="c-tags">
          <span v-for="dependency in detail.dependencies" :key="dependency.slug" class="c-tag">{{ dependency.name }}</span>
        </div>
      </section>

      <section class="c-detail-block">
        <h4 class="c-detail-title">{{ t('snippets.detail.traffic') }}</h4>
        <div class="c-tags">
          <span class="c-tag">{{ t('snippets.detail.copies') }}: {{ detail.copies }}</span>
          <span class="c-tag">{{ t('snippets.detail.forks') }}: {{ detail.forks }}</span>
          <span class="c-tag">{{ t('snippets.detail.favorites') }}: {{ detail.favorites }}</span>
        </div>
      </section>

      <section class="c-detail-block">
        <h4 class="c-detail-title">{{ t('snippets.detail.code') }}</h4>
        <pre class="c-code">{{ detail.code }}</pre>
      </section>

      <div v-if="canOpenSite" class="c-action-row">
        <Button as="a" :href="siteUrl" target="_blank" rel="noopener noreferrer" :label="t('content.openSite')"
          severity="secondary" outlined size="small" />
      </div>
    </div>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

// 控制台 · 代码段管理：全量列表（含 private / 已删除）+ 详情查看 + 软删除 / 恢复
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface SnippetRow {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: 'public' | 'unlisted' | 'private'
  status: 'active' | 'deleted'
  createdAt: string
  updatedAt: string
  nickname: string
  username: string | null
  email: string
  avatarUrl: string | null
  owner: string
  language_slug: string | null
  language_name: string | null
  language_logo: string | null
  group_slug: string | null
  group_name: string | null
  copies: number
  forks: number
  favorites: number
}

interface SnippetDetail {
  sid: string
  slug: string
  name: string
  intro: string
  code: string
  visibility: 'public' | 'unlisted' | 'private'
  status: 'active' | 'deleted'
  createdAt: string
  updatedAt: string
  author: { nickname: string, username: string | null, email: string, avatarUrl: string | null }
  language: { slug: string, name: string, logo_url: string | null } | null
  group: { slug: string, name: string } | null
  copies: number
  forks: number
  favorites: number
  tags: { key: string, name: string }[]
  dependencies: { slug: string, name: string, kind: string, logo_url: string | null }[]
}

const LIST_LIMIT = 500

const { t, locale, restoreLocale } = useConsoleI18n()
const { advanced, requireAdvanced } = useAdminAdvanced()
const toast = useToast()
const confirm = useConfirm()

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{
  snippets: SnippetRow[]
  total: number
  truncated: boolean
}>('/api/dashboard/snippets')

const snippets = computed(() => data.value?.snippets ?? [])
const total = computed(() => data.value?.total ?? 0)
const truncated = computed(() => data.value?.truncated ?? false)

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'name', header: t('snippets.col.name'), width: '16rem' },
  { field: 'owner', header: t('snippets.col.owner'), width: '15rem' },
  { field: 'language_name', header: t('snippets.col.language'), width: '9rem' },
  {
    field: 'visibility',
    header: t('snippets.col.visibility'),
    type: 'enum',
    groupable: true,
    width: '7.5rem',
    options: [
      { label: t('content.visibility.public'), value: 'public' },
      { label: t('content.visibility.unlisted'), value: 'unlisted' },
      { label: t('content.visibility.private'), value: 'private' }
    ]
  },
  {
    field: 'status',
    header: t('snippets.col.status'),
    type: 'enum',
    groupable: true,
    width: '7rem',
    options: [
      { label: t('content.status.active'), value: 'active' },
      { label: t('content.status.deleted'), value: 'deleted' }
    ]
  },
  { field: 'group_name', header: t('snippets.col.group'), width: '10rem' },
  { field: 'copies', header: t('snippets.col.copies'), type: 'number', dataType: 'numeric', width: '5.5rem' },
  { field: 'forks', header: t('snippets.col.forks'), type: 'number', dataType: 'numeric', width: '5rem', defaultHidden: true },
  { field: 'updatedAt', header: t('snippets.col.updated'), type: 'date', width: '11rem' },
  {
    field: 'actions',
    header: t('snippets.col.actions'),
    type: 'actions',
    sortable: false,
    width: '12rem',
    frozen: true,
    frozenAlign: 'right'
  }
])

function visibilitySeverity(value: string): 'success' | 'warn' | 'secondary' {
  if (value === 'public') return 'success'
  if (value === 'unlisted') return 'warn'
  return 'secondary'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function notify(severity: 'success' | 'error', summary: string, detailMsg?: string) {
  toast.add({ severity, summary, detail: detailMsg, life: severity === 'error' ? 6000 : 3000 })
}

function apiError(err: unknown) {
  const e = err as { statusMessage?: string }
  return e.statusMessage ?? t('common.tryAgain')
}

// ---------- 详情 ----------
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<SnippetDetail | null>(null)

const siteUrl = computed(() => {
  if (!detail.value?.author.username) return ''
  return `/${detail.value.author.username}/${detail.value.slug}`
})

const canOpenSite = computed(() => {
  const item = detail.value
  return !!item && item.status === 'active' && item.visibility !== 'private' && !!item.author.username
})

async function openDetail(row: SnippetRow) {
  detail.value = null
  detailLoading.value = true
  detailVisible.value = true
  try {
    detail.value = (await $fetch<{ snippet: SnippetDetail }>(`/api/dashboard/snippets/${row.sid}`)).snippet
  } catch (err) {
    detailVisible.value = false
    notify('error', t('snippets.toast.failed'), apiError(err))
  } finally {
    detailLoading.value = false
  }
}

// ---------- 软删除 / 恢复 ----------
function askConfirm(options: {
  header: string
  message: string
  acceptLabel: string
  severity?: 'danger' | 'secondary'
  action: () => Promise<void>
}) {
  confirm.require({
    header: options.header,
    message: options.message,
    acceptLabel: options.acceptLabel,
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: options.severity ?? 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () => {
      void options.action().catch(err => notify('error', t('snippets.toast.failed'), apiError(err)))
    }
  })
}

function askDelete(row: SnippetRow) {
  askConfirm({
    header: t('snippets.deleteConfirm.header'),
    message: t('snippets.deleteConfirm.message', { name: row.name }),
    acceptLabel: t('snippets.delete'),
    severity: 'danger',
    action: async () => {
      if (!(await requireAdvanced())) return
      await $fetch(`/api/dashboard/snippets/${row.sid}`, { method: 'PATCH', body: { deleted: true } })
      await refresh()
      if (detail.value?.sid === row.sid) detail.value.status = 'deleted'
      notify('success', t('snippets.toast.deleted'))
    }
  })
}

function askRestore(row: SnippetRow) {
  askConfirm({
    header: t('snippets.restoreConfirm.header'),
    message: t('snippets.restoreConfirm.message', { name: row.name }),
    acceptLabel: t('snippets.restore'),
    severity: 'secondary',
    action: async () => {
      await $fetch(`/api/dashboard/snippets/${row.sid}`, { method: 'PATCH', body: { deleted: false } })
      await refresh()
      if (detail.value?.sid === row.sid) detail.value.status = 'active'
      notify('success', t('snippets.toast.restored'))
    }
  })
}

useHead({
  title: () => t('title.snippets'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
@use '../../assets/css/console-content.scss';
</style>
