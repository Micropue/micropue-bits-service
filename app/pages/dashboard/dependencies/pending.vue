<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('review.dependenciesTitle') }}</h2>
        <p class="page-sub">
          {{ t('review.subtitle', { pending: counts.pending, approved: counts.approved, rejected: counts.rejected }) }}
        </p>
      </div>
    </header>

    <ConsoleDataTable v-model:selection="selection" :value="requests" :columns="columns" data-key="sid"
      :loading="pending" :rows="25" :selectable="false" @refresh="refresh">
      <template #toolbar>
        <Select input-id="review-status" v-model="status" :options="statusOptions" option-label="label"
          option-value="value" class="status-select" :aria-label="t('review.status')" />
      </template>

      <template #cell-name="{ row }">
        <div class="cell-main">
          <span class="cell-title">{{ row.name }}</span>
          <span class="cell-sub">{{ row.contact_email }}</span>
        </div>
      </template>

      <template #cell-dependency_kind="{ row }">
        <Tag v-if="row.dependency_kind" :value="t(`kind.${row.dependency_kind}`)" severity="secondary" rounded />
        <span v-else>—</span>
      </template>

      <template #cell-language_text="{ row }">
        <div class="cell-tags">
          <Tag v-for="language in row.languages" :key="language.sid"
            :value="language.isPrimary ? `${language.name} ·` : language.name"
            :severity="language.isPrimary ? 'contrast' : 'secondary'" rounded />
          <span v-if="!row.languages?.length" class="cell-muted">—</span>
        </div>
      </template>

      <template #cell-link_url="{ row }">
        <a v-if="row.link_url" class="cell-link" :href="String(row.link_url)" target="_blank" rel="noopener">
          {{ t('common.open') }}
        </a>
        <span v-else>—</span>
      </template>

      <template #cell-status="{ row }">
        <Tag :value="t(`review.status.${row.status}`)" :severity="statusSeverity(row.status)" rounded />
        <span v-if="row.status === 'rejected' && row.reject_reason" class="cell-sub">{{ row.reject_reason }}</span>
      </template>

      <template #cell-actions="{ row }">
        <div class="cell-actions">
          <template v-if="row.status === 'pending'">
            <Button :label="t('review.approve')" size="small" :disabled="busy"
              @click="openApprove(row)" />
            <Button :label="t('review.reject')" severity="danger" text size="small" :disabled="busy"
              @click="openReject(row)" />
          </template>
          <NuxtLink v-else-if="row.published_sid" class="cell-link" :to="publicLink(row)">
            {{ t('review.viewPublished') }}
          </NuxtLink>
        </div>
      </template>
    </ConsoleDataTable>
  </div>

  <!-- 通过：补全信息后发布（用户没填的字段在这里补齐） -->
  <Dialog v-model:visible="approveDialog" modal :draggable="false" :style="{ width: '36rem' }"
    :header="t('review.approveHeader', { name: reviewTarget?.name ?? '' })">
    <div class="form">
      <p class="dash-card-note">{{ t('review.approveNote') }}</p>

      <label class="field" for="review-slug">
        <span>{{ t('catalog.slug') }}</span>
        <InputText id="review-slug" v-model="draft.slug" name="slug" maxlength="40" autocomplete="off" fluid />
      </label>
      <label class="field" for="review-name">
        <span>{{ t('catalog.name') }}</span>
        <InputText id="review-name" v-model="draft.name" name="name" maxlength="64" autocomplete="off" fluid />
      </label>

      <template v-if="reviewTarget?.kind === 'dependency'">
        <label class="field" for="review-kind">
          <span>{{ t('dependencies.kind') }}</span>
          <Select input-id="review-kind" v-model="draft.kind" :options="kindOptions" option-label="label"
            option-value="value" fluid />
        </label>
        <label class="field" for="review-langs">
          <span>{{ t('dependencies.languages') }}</span>
          <MultiSelect input-id="review-langs" v-model="draft.language_sids" :options="languageOptions"
            option-label="label" option-value="value" filter :max-selected-labels="4" fluid />
          <small class="hint">{{ t('dependencies.languagesHint') }}</small>
        </label>
      </template>

      <label class="field" for="review-intro">
        <span>{{ t('catalog.intro') }}</span>
        <Textarea id="review-intro" v-model="draft.intro" name="intro" rows="3" maxlength="500" auto-resize fluid />
      </label>
      <label class="field" for="review-logo">
        <span>{{ t('catalog.logo') }}</span>
        <InputText id="review-logo" v-model="draft.logo_url" name="logo_url" autocomplete="off" fluid
          placeholder="https://…" />
      </label>
      <label class="field" for="review-link">
        <span>{{ t('catalog.link') }}</span>
        <InputText id="review-link" v-model="draft.link_url" name="link_url" autocomplete="off" fluid />
      </label>
      <label class="field" for="review-sort">
        <span>{{ t('catalog.sortOrder') }}</span>
        <InputNumber input-id="review-sort" v-model="draft.sort_order" :use-grouping="false" fluid />
      </label>

      <Message v-if="dialogError" severity="error" :closable="false">{{ dialogError }}</Message>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="approveDialog = false" />
      <Button :label="t('review.publish')" :loading="saving" @click="approve" />
    </template>
  </Dialog>

  <!-- 驳回：写明原因 -->
  <Dialog v-model:visible="rejectDialog" modal :draggable="false" :style="{ width: '30rem' }"
    :header="t('review.rejectHeader', { name: reviewTarget?.name ?? '' })">
    <div class="form">
      <p class="dash-card-note">{{ t('review.rejectNote') }}</p>
      <label class="field" for="review-reason">
        <span>{{ t('review.reason') }}</span>
        <Textarea id="review-reason" v-model="rejectReason" name="reason" rows="3" maxlength="500" auto-resize fluid />
      </label>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="rejectDialog = false" />
      <Button :label="t('review.reject')" severity="danger" :loading="saving" @click="reject" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

// 依赖申请审核队列：与「已发布」用同一张表组件；通过时补全信息并发布
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface RequestLanguage {
  sid: string
  name: string
  isPrimary: boolean
}

interface RequestRow {
  sid: string
  kind: string
  status: string
  contact_email: string
  name: string
  link_url: string
  dependency_kind: string | null
  language_sids: string[]
  languages: RequestLanguage[]
  language_text: string
  reject_reason: string
  published_sid: string | null
  created_at: string
}

const { t, restoreLocale } = useConsoleI18n()
const toast = useToast()

onMounted(restoreLocale)

const status = ref<'pending' | 'approved' | 'rejected'>('pending')
const selection = ref<RequestRow[]>([])

const { data, pending, refresh } = await useFetch<{
  requests: RequestRow[]
  counts: Record<string, number>
}>('/api/dashboard/requests', { query: { kind: 'dependency', status } })

// 切状态重新拉取
watch(status, () => refresh())

const requests = computed(() => data.value?.requests ?? [])
const counts = computed(() => data.value?.counts ?? { pending: 0, approved: 0, rejected: 0 })

const statusOptions = computed(() => [
  { label: t('review.status.pending'), value: 'pending' },
  { label: t('review.status.approved'), value: 'approved' },
  { label: t('review.status.rejected'), value: 'rejected' }
])

const { data: languageData } = await useFetch<{ languages: { sid: string, name: string }[] }>('/api/dashboard/languages')
const languageOptions = computed(() =>
  (languageData.value?.languages ?? [])
    .map(language => ({ label: language.name, value: language.sid }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))

const kindOptions = computed(() =>
  (['framework', 'library', 'tool', 'runtime'] as const).map(kind => ({ label: t(`kind.${kind}`), value: kind })))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'name', header: t('review.col.name'), width: '16rem' },
  { field: 'link_url', header: t('catalog.link'), sortable: false, width: '7rem' },
  { field: 'dependency_kind', header: t('dependencies.kind'), type: 'enum', options: kindOptions.value,
    matchMode: 'equals', groupable: true, width: '8rem' },
  { field: 'language_text', header: t('dependencies.languages'), sortable: false, width: '14rem' },
  { field: 'created_at', header: t('review.col.submittedAt'), type: 'date', width: '11rem' },
  { field: 'status', header: t('review.status'), width: '10rem', matchMode: 'equals' },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', sortable: false, width: '12rem',
    frozen: true, frozenAlign: 'right' }
])

function statusSeverity(value: string) {
  if (value === 'approved') return 'secondary'
  if (value === 'rejected') return 'danger'
  return 'warn'
}

function publicLink(row: RequestRow) {
  return row.kind === 'language' ? '/languages' : '/dependencies'
}

// 依赖队列额外用到的标签渲染（语言/类型）由上面的插槽统一处理

// ---------- 通过 ----------
const approveDialog = ref(false)
const dialogError = ref('')
const saving = ref(false)
const busy = ref(false)
const reviewTarget = ref<RequestRow | null>(null)
const draft = ref({
  slug: '',
  name: '',
  kind: 'library',
  language_sids: [] as string[],
  intro: '',
  logo_url: '',
  link_url: '',
  sort_order: 0
})

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function notify(severity: 'success' | 'error', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3000 })
}

function openApprove(row: RequestRow) {
  reviewTarget.value = row
  draft.value = {
    slug: slugify(row.name),
    name: row.name,
    kind: row.dependency_kind ?? 'library',
    language_sids: [...row.language_sids],
    intro: '',
    logo_url: '',
    link_url: row.link_url,
    sort_order: 0
  }
  dialogError.value = ''
  approveDialog.value = true
}

async function approve() {
  if (saving.value || !reviewTarget.value) return
  saving.value = true
  dialogError.value = ''
  try {
    await $fetch(`/api/dashboard/requests/${reviewTarget.value.sid}/approve`, {
      method: 'POST',
      body: {
        slug: draft.value.slug,
        name: draft.value.name,
        intro: draft.value.intro,
        logo_url: draft.value.logo_url,
        link_url: draft.value.link_url,
        sort_order: draft.value.sort_order,
        kind: draft.value.kind,
        language_sids: draft.value.language_sids
      }
    })
    approveDialog.value = false
    await refresh()
    notify('success', t('toast.requestApproved', { name: draft.value.name }))
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string, data?: { data?: { field?: string } } }
    const message = e.statusMessage ?? t('common.tryAgain')
    // 字段类错误留在弹窗里提示，其余走 Toast
    if (e.data?.data?.field && e.data.data.field !== 'sort_order') dialogError.value = message
    else notify('error', t('toast.requestApproveFailed'), message)
  } finally {
    saving.value = false
  }
}

// ---------- 驳回 ----------
const rejectDialog = ref(false)
const rejectReason = ref('')

function openReject(row: RequestRow) {
  reviewTarget.value = row
  rejectReason.value = ''
  rejectDialog.value = true
}

async function reject() {
  if (saving.value || !reviewTarget.value) return
  saving.value = true
  try {
    await $fetch(`/api/dashboard/requests/${reviewTarget.value.sid}/reject`, {
      method: 'POST',
      body: { reason: rejectReason.value }
    })
    rejectDialog.value = false
    await refresh()
    notify('success', t('toast.requestRejected', { name: reviewTarget.value.name }))
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    notify('error', t('toast.requestRejectFailed'),
      e.statusMessage ?? t('common.tryAgain'))
  } finally {
    saving.value = false
  }
}

useHead({
  title: () => t('title.dependenciesPending'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.page-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.page-sub {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.status-select {
  width: 11rem;
}

.cell-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cell-title {
  font-weight: 500;
}

.cell-sub {
  display: block;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.cell-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.cell-muted {
  color: var(--p-text-muted-color);
}

.cell-link {
  color: var(--p-text-color);
  font-size: 0.85rem;
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.hint {
  font-size: 0.75rem;
  font-weight: 400;
}
</style>
