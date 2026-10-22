<template>
  <div class="c-page">
    <header class="c-page-head">
      <div>
        <h2 class="c-page-title">{{ t('reports.title') }}</h2>
        <p class="c-page-sub">{{ t('reports.subtitle', { count: total }) }}</p>
      </div>
    </header>

    <ConsoleDataTable :value="rows" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['target_name', 'target_username', 'type_label', 'reporter_name', 'reporter_email', 'detail']"
      @refresh="refresh">
      <template #cell-target_name="{ row }">
        <div class="c-cell-text">
          <span class="c-cell-title">{{ row.target.name }}</span>
          <span class="c-cell-sub">{{ row.target.username ? `@${row.target.username}` : row.target.kind }}</span>
        </div>
      </template>

      <template #cell-target_kind="{ row }">
        <Tag :value="t(`report.target.${row.target.kind}`)" severity="secondary" rounded />
        <StatusTag v-if="row.target.deleted" :label="t('content.status.deleted')" status="deleted" severity="danger" />
      </template>

      <template #cell-type_label="{ row }">
        {{ row.type_label }}
      </template>

      <template #cell-reporter_name="{ row }">
        <div class="c-owner">
          <UserAvatar :src="row.reporter.avatarUrl" :size="28" />
          <span class="c-cell-text">
            <span class="c-cell-title">{{ row.reporter.nickname }}</span>
            <span class="c-cell-sub">{{ row.reporter.username ? `@${row.reporter.username}` : row.reporter.email }}</span>
          </span>
        </div>
      </template>

      <template #cell-status="{ row }">
        <StatusTag :label="t(`report.status.${row.status}`)" :status="row.status" :severity="statusSeverity(row.status)" />
      </template>

      <template #cell-actions="{ row }">
        <Button :label="t('content.view')" severity="secondary" text size="small" @click="openDetail(row)" />
      </template>
    </ConsoleDataTable>
  </div>

  <Dialog v-model:visible="detailVisible" modal :draggable="false" :style="{ width: '38rem' }"
    :header="t('reports.detail.title')">
    <div v-if="detail" class="c-detail">
      <div class="c-detail-head">
        <div>
          <h3 class="c-detail-name">{{ detail.target.name }}</h3>
          <p class="c-detail-sub">{{ detail.target.username ? `@${detail.target.username}` : t(`report.target.${detail.target.kind}`) }}</p>
        </div>
        <div class="c-tags">
          <Tag :value="t(`report.target.${detail.target.kind}`)" severity="secondary" rounded />
          <StatusTag :label="t(`report.status.${detail.status}`)" :status="detail.status" :severity="statusSeverity(detail.status)" />
        </div>
      </div>

      <section class="c-detail-block">
        <div class="c-kv">
          <span class="c-k">{{ t('reports.detail.reporter') }}</span>
          <span class="c-v c-owner">
            <UserAvatar :src="detail.reporter.avatarUrl" :size="26" />
            <span>{{ detail.reporter.nickname }} · {{ detail.reporter.username ? `@${detail.reporter.username}` : detail.reporter.email }}</span>
          </span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('reports.detail.type') }}</span>
          <span class="c-v">{{ detail.type_label }}</span>
        </div>
        <div class="c-kv">
          <span class="c-k">{{ t('reports.detail.created') }}</span>
          <span class="c-v">{{ formatDate(detail.createdAt) }}</span>
        </div>
      </section>

      <section class="c-detail-block">
        <h4 class="c-detail-title">{{ t('reports.detail.detail') }}</h4>
        <p class="c-v report-detail">{{ detail.detail }}</p>
      </section>

      <section class="c-detail-block report-manage">
        <h4 class="c-detail-title">{{ t('reports.detail.manage') }}</h4>
        <div class="c-kv">
          <span class="c-k">{{ t('reports.detail.status') }}</span>
          <Select v-model="statusDraft" :options="statusOptions" option-label="label" option-value="value"
            :allow-empty="false" :aria-label="t('reports.detail.status')" fluid />
        </div>
        <div class="c-kv report-result">
          <span class="c-k">{{ t('reports.detail.result') }}</span>
          <Textarea v-model="resultDraft" rows="3" maxlength="500" auto-resize fluid
            :aria-label="t('reports.detail.result')" :placeholder="t('reports.detail.resultHint')" />
        </div>
        <div v-if="siteLink" class="c-action-row">
          <Button as="a" :href="siteLink" target="_blank" rel="noopener noreferrer" :label="t('content.openSite')"
            severity="secondary" outlined size="small" />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="report-footer">
        <Button :label="t('reports.delete')" severity="danger" text :loading="deleting" :disabled="saving"
          @click="askDelete" />
        <div class="report-footer-actions">
          <Button :label="t('common.cancel')" severity="secondary" text @click="detailVisible = false" />
          <Button :label="t('common.save')" :loading="saving" :disabled="deleting" @click="saveReport" />
        </div>
      </div>
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

import { REPORT_STATUSES, type ReportStatus } from '#shared/utils/moderation'

const { t, restoreLocale, locale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()
onMounted(restoreLocale)

interface ReportRow {
  sid: string
  type: string
  type_label: string
  detail: string
  status: string
  result: string
  handledAt: string | null
  createdAt: string
  target: {
    kind: 'user' | 'snippet' | 'group'
    name: string
    username: string | null
    slug: string | null
    visibility: string | null
    deleted: boolean
  }
  target_name: string
  target_username: string
  target_kind: 'user' | 'snippet' | 'group'
  created_at: string
  reporter: {
    nickname: string
    username: string | null
    email: string
    avatarUrl: string | null
  }
  reporter_name: string
  reporter_email: string
}

const { data, pending, refresh } = await useFetch<{ reports: ReportRow[], total: number, truncated: boolean }>(
  '/api/dashboard/reports'
)

const rows = computed<ReportRow[]>(() => {
  const list = data.value?.reports ?? []
  return list.map(row => ({
    ...row,
    type_label: t(`report.type.${row.type}`),
    target_name: row.target.name,
    target_username: row.target.username ?? '',
    target_kind: row.target.kind,
    created_at: row.createdAt,
    reporter_name: row.reporter.nickname,
    reporter_email: row.reporter.email
  }))
})
const total = computed(() => data.value?.total ?? 0)

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'target_name', header: t('reports.col.target'), width: '18rem' },
  { field: 'target_kind', header: t('reports.col.targetKind'), width: '8rem', matchMode: 'equals' },
  { field: 'type_label', header: t('reports.col.type'), width: '14rem' },
  { field: 'reporter_name', header: t('reports.col.reporter'), width: '16rem' },
  { field: 'status', header: t('reports.col.status'), width: '8rem', matchMode: 'equals' },
  { field: 'created_at', header: t('reports.col.created'), type: 'date', width: '10rem' },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', sortable: false, width: '6rem',
    frozen: true, frozenAlign: 'right' }
])

const detailVisible = ref(false)
const detail = ref<ReportRow | null>(null)
const statusDraft = ref<ReportStatus>('pending')
const resultDraft = ref('')
const saving = ref(false)
const deleting = ref(false)

const statusOptions = computed(() => REPORT_STATUSES.map(status => ({
  label: t(`report.status.${status}`),
  value: status
})))

function statusSeverity(status: string) {
  if (status === 'removed') return 'danger'
  if (status === 'restricted') return 'contrast'
  if (status === 'ignored') return 'secondary'
  return 'warn'
}

function openDetail(row: ReportRow) {
  detail.value = row
  statusDraft.value = row.status as ReportStatus
  resultDraft.value = row.result ?? ''
  detailVisible.value = true
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', { dateStyle: 'medium' }) : '—'
}

async function saveReport() {
  if (!detail.value || saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/dashboard/reports/${encodeURIComponent(detail.value.sid)}`, {
      method: 'PATCH',
      body: { status: statusDraft.value, result: resultDraft.value.trim() }
    })
    detailVisible.value = false
    await refresh()
    toast.add({ severity: 'success', summary: t('toast.reportUpdated'), life: 3000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain'), life: 5000 })
  } finally {
    saving.value = false
  }
}

function askDelete() {
  if (!detail.value || deleting.value) return
  const sid = detail.value.sid
  confirm.require({
    header: t('reports.deleteTitle'),
    message: t('reports.deleteMessage'),
    acceptLabel: t('reports.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      deleting.value = true
      try {
        await $fetch(`/api/dashboard/reports/${encodeURIComponent(sid)}`, { method: 'DELETE' })
        detailVisible.value = false
        await refresh()
        toast.add({ severity: 'success', summary: t('toast.reportDeleted'), life: 3000 })
      } catch (err) {
        toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain'), life: 5000 })
      } finally {
        deleting.value = false
      }
    }
  })
}

const siteLink = computed(() => {
  const row = detail.value
  if (!row || !row.target.username || row.target.deleted) return null
  if (row.target.kind === 'user') return `/${row.target.username}`
  if (row.target.visibility === 'private') return null
  return `/${row.target.username}/${row.target.slug}`
})

useHead({
  title: () => t('title.reports'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
@use '../../assets/css/console-content.scss';

.c-owner {
  align-items: center;
  line-height: 1.4;
}

.c-owner :deep(.user-avatar) {
  flex: none;
}

.c-kv {
  align-items: start;
}

.c-k {
  line-height: 1.5;
}

.c-v.c-owner {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.report-detail {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--dash-border);
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--p-text-color) 3%, var(--p-content-background));
  font-size: 0.86rem;
  line-height: 1.65;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.report-result {
  align-items: start;
}

.report-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.report-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
