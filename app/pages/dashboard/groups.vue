<template>
  <div class="c-page">
    <header class="c-page-head">
      <div>
        <h2 class="c-page-title">{{ t('groups.title') }}</h2>
        <p class="c-page-sub">
          {{ total === 1 ? t('groups.subtitle', { count: total }) : t('groups.subtitlePlural', { count: total }) }}
        </p>
        <p v-if="truncated" class="c-page-note">{{ t('groups.truncated', { limit: LIST_LIMIT }) }}</p>
      </div>
    </header>

    <ConsoleDataTable :value="groups" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['name', 'slug', 'owner', 'intro']" @refresh="refresh">
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

      <template #cell-visibility="{ row }">
        <Tag :value="t(`content.visibility.${row.visibility}`)" :severity="visibilitySeverity(row.visibility)" rounded />
      </template>

      <template #cell-status="{ row }">
        <Tag :value="t(`content.status.${row.status}`)" :severity="row.status === 'deleted' ? 'danger' : 'secondary'"
          rounded />
      </template>

      <template #cell-actions="{ row }">
        <div class="c-cell-actions">
          <Button :label="t('content.view')" severity="secondary" text size="small" @click="openDetail(row)" />
          <Button v-if="row.status === 'active'" :label="t('groups.delete')" severity="danger" text size="small"
            @click="askDelete(row)" />
          <Button v-else :label="t('groups.restore')" severity="secondary" text size="small"
            @click="askRestore(row)" />
        </div>
      </template>
    </ConsoleDataTable>
  </div>

  <!-- 详情：分组信息 + 组内代码段（含已删除，便于排查） -->
  <Dialog v-model:visible="detailVisible" modal :draggable="false" :style="{ width: '48rem' }"
    :header="t('groups.detail.title')">
    <div v-if="detailLoading" class="c-detail-loading">{{ t('groups.loading') }}</div>

    <div v-else-if="detail" class="c-detail">
      <div class="c-detail-head">
        <div>
          <h3 class="c-detail-name">{{ detail.name }}</h3>
          <p class="c-detail-sub c-mono">/{{ detail.slug }}</p>
        </div>
        <div class="c-tags">
          <Tag :value="t(`content.visibility.${detail.visibility}`)" :severity="visibilitySeverity(detail.visibility)"
            rounded />
          <Tag :value="t(`content.status.${detail.status}`)" :severity="detail.status === 'deleted' ? 'danger' : 'secondary'"
            rounded />
        </div>
      </div>

      <section class="c-detail-block">
        <div class="c-kv">
          <span class="c-k">{{ t('groups.detail.author') }}</span>
          <span class="c-v c-owner">
            <UserAvatar :src="detail.author.avatarUrl" :size="26" />
            <span>{{ detail.author.nickname }} · {{ detail.author.username ? `@${detail.author.username}` : detail.author.email }}</span>
          </span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('groups.detail.created') }}</span>
          <span class="c-v">{{ formatDate(detail.createdAt) }}</span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('groups.detail.updated') }}</span>
          <span class="c-v">{{ formatDate(detail.updatedAt) }}</span>
        </div>
      </section>

      <section v-if="detail.intro" class="c-detail-block">
        <h4 class="c-detail-title">{{ t('groups.detail.intro') }}</h4>
        <p class="c-v">{{ detail.intro }}</p>
      </section>

      <section v-if="detail.tags.length" class="c-detail-block">
        <h4 class="c-detail-title">{{ t('groups.detail.tags') }}</h4>
        <div class="c-tags">
          <span v-for="tag in detail.tags" :key="tag.key" class="c-tag">{{ tag.name }}</span>
        </div>
      </section>

      <section class="c-detail-block">
        <h4 class="c-detail-title">{{ t('groups.detail.contents') }}</h4>
        <p v-if="!detail.snippets.length" class="c-muted">{{ t('groups.detail.contentsEmpty') }}</p>
        <div v-else class="c-snippet-list">
          <div v-for="snippet in detail.snippets" :key="snippet.sid" class="c-snippet-row">
            <div class="c-snippet-main">
              <span class="c-cell-title">{{ snippet.name }}</span>
              <span class="c-cell-sub c-mono">/{{ snippet.slug }}</span>
            </div>
            <Tag :value="t(`content.status.${snippet.status}`)"
              :severity="snippet.status === 'deleted' ? 'danger' : 'secondary'" rounded />
          </div>
        </div>
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

// 控制台 · 代码段分组管理：全量列表（含 private / 已删除）+ 组内代码段 + 软删除 / 恢复
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface GroupRow {
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
  snippetCount: number
}

interface GroupDetail {
  sid: string
  slug: string
  name: string
  intro: string
  visibility: 'public' | 'unlisted' | 'private'
  status: 'active' | 'deleted'
  createdAt: string
  updatedAt: string
  author: { nickname: string, username: string | null, email: string, avatarUrl: string | null }
  tags: { key: string, name: string }[]
  snippets: { sid: string, slug: string, name: string, status: 'active' | 'deleted', updatedAt: string }[]
}

const LIST_LIMIT = 500

const { t, locale, restoreLocale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{
  groups: GroupRow[]
  total: number
  truncated: boolean
}>('/api/dashboard/groups')

const groups = computed(() => data.value?.groups ?? [])
const total = computed(() => data.value?.total ?? 0)
const truncated = computed(() => data.value?.truncated ?? false)

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'name', header: t('groups.col.name'), width: '16rem' },
  { field: 'owner', header: t('groups.col.owner'), width: '15rem' },
  {
    field: 'visibility',
    header: t('groups.col.visibility'),
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
    header: t('groups.col.status'),
    type: 'enum',
    groupable: true,
    width: '7rem',
    options: [
      { label: t('content.status.active'), value: 'active' },
      { label: t('content.status.deleted'), value: 'deleted' }
    ]
  },
  {
    field: 'snippetCount',
    header: t('groups.col.snippets'),
    type: 'number',
    dataType: 'numeric',
    width: '7rem'
  },
  { field: 'updatedAt', header: t('groups.col.updated'), type: 'date', width: '11rem' },
  {
    field: 'actions',
    header: t('groups.col.actions'),
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
const detail = ref<GroupDetail | null>(null)

const siteUrl = computed(() => {
  if (!detail.value?.author.username) return ''
  return `/${detail.value.author.username}/${detail.value.slug}`
})

const canOpenSite = computed(() => {
  const item = detail.value
  return !!item && item.status === 'active' && item.visibility !== 'private' && !!item.author.username
})

async function openDetail(row: GroupRow) {
  detail.value = null
  detailLoading.value = true
  detailVisible.value = true
  try {
    detail.value = (await $fetch<{ group: GroupDetail }>(`/api/dashboard/groups/${row.sid}`)).group
  } catch (err) {
    detailVisible.value = false
    notify('error', t('groups.toast.failed'), apiError(err))
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
      void options.action().catch(err => notify('error', t('groups.toast.failed'), apiError(err)))
    }
  })
}

function askDelete(row: GroupRow) {
  askConfirm({
    header: t('groups.deleteConfirm.header'),
    message: t('groups.deleteConfirm.message', { name: row.name }),
    acceptLabel: t('groups.delete'),
    severity: 'danger',
    action: async () => {
      await $fetch(`/api/dashboard/groups/${row.sid}`, { method: 'PATCH', body: { deleted: true } })
      await refresh()
      if (detail.value?.sid === row.sid) detail.value.status = 'deleted'
      notify('success', t('groups.toast.deleted'))
    }
  })
}

function askRestore(row: GroupRow) {
  askConfirm({
    header: t('groups.restoreConfirm.header'),
    message: t('groups.restoreConfirm.message', { name: row.name }),
    acceptLabel: t('groups.restore'),
    severity: 'secondary',
    action: async () => {
      await $fetch(`/api/dashboard/groups/${row.sid}`, { method: 'PATCH', body: { deleted: false } })
      await refresh()
      if (detail.value?.sid === row.sid) detail.value.status = 'active'
      notify('success', t('groups.toast.restored'))
    }
  })
}

useHead({
  title: () => t('title.groups'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
@use '../../assets/css/console-content.scss';
</style>
