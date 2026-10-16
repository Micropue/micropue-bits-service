<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('dependencies.title') }}</h2>
        <p class="page-sub">{{ t('dependencies.subtitle', { count: dependencies.length }) }}</p>
      </div>
      <Button v-if="canWrite" :label="t('dependencies.new')" size="small" @click="openCreate">
        <template #icon>
          <Plus aria-hidden="true" />
        </template>
      </Button>
    </header>

    <ConsoleDataTable v-model:selection="selection" :value="dependencies" :columns="columns" data-key="sid"
      :loading="pending" :rows="25" @refresh="refresh">
      <template #cell-name="{ row }">
        <div class="cell-main">
          <img v-if="row.logo_url" class="cell-logo" :src="String(row.logo_url)" alt="" loading="lazy"
            @error="($event.target as HTMLImageElement).style.display = 'none'">
          <div>
            <span class="cell-title">{{ row.name }}</span>
            <span class="cell-sub">{{ row.slug }}</span>
          </div>
        </div>
      </template>

      <template #cell-language_text="{ row }">
        <div class="cell-tags">
          <Tag v-for="language in row.languages" :key="language.sid"
            :value="language.isPrimary ? `${language.name} ·` : language.name"
            :severity="language.isPrimary ? 'contrast' : 'secondary'" rounded />
          <span v-if="!row.languages?.length" class="cell-muted">—</span>
        </div>
      </template>

      <template #cell-intro="{ row }">
        <span class="cell-intro">{{ row.intro || '—' }}</span>
      </template>

      <template #cell-link_url="{ row }">
        <a v-if="row.link_url" class="cell-link" :href="String(row.link_url)" target="_blank" rel="noopener">
          {{ t('common.open') }}
        </a>
        <span v-else>—</span>
      </template>

      <template #cell-actions="{ row }">
        <div class="cell-actions">
          <Button :label="t('admins.edit')" severity="secondary" text size="small" :disabled="busy"
            @click="openEdit(row)" />
          <Button :label="t('sec.remove')" severity="danger" text size="small" :disabled="busy"
            @click="askRemoveMany([row])" />
        </div>
      </template>

      <template #bulk="{ selection: rows }">
        <Button :label="t('table.removeSelected')" severity="danger" outlined size="small" :disabled="busy"
          @click="askRemoveMany(rows)" />
      </template>
    </ConsoleDataTable>
  </div>

  <Dialog v-model:visible="dialogVisible" modal :draggable="false" :style="{ width: '36rem' }"
    :header="editing ? t('dependencies.edit') : t('dependencies.new')">
    <div class="form">
      <label class="field" for="dep-slug">
        <span>{{ t('catalog.slug') }}</span>
        <InputText id="dep-slug" v-model="draft.slug" name="slug" maxlength="40" autocomplete="off" placeholder="vue"
          fluid />
      </label>
      <label class="field" for="dep-name">
        <span>{{ t('catalog.name') }}</span>
        <InputText id="dep-name" v-model="draft.name" name="name" maxlength="64" autocomplete="off" fluid />
      </label>
      <label class="field" for="dep-kind">
        <span>{{ t('dependencies.kind') }}</span>
        <Select input-id="dep-kind" v-model="draft.kind" :options="kindOptions" option-label="label"
          option-value="value" fluid />
      </label>
      <label class="field" for="dep-langs">
        <span>{{ t('dependencies.languages') }}</span>
        <MultiSelect input-id="dep-langs" v-model="draft.language_sids" :options="languageOptions"
          option-label="label" option-value="value" filter :max-selected-labels="4" fluid />
        <small class="hint">{{ t('dependencies.languagesHint') }}</small>
      </label>
      <label class="field" for="dep-intro">
        <span>{{ t('catalog.intro') }}</span>
        <Textarea id="dep-intro" v-model="draft.intro" name="intro" rows="3" maxlength="500" auto-resize fluid />
      </label>
      <label class="field" for="dep-logo">
        <span>{{ t('catalog.logo') }}</span>
        <InputText id="dep-logo" v-model="draft.logo_url" name="logo_url" autocomplete="off" fluid
          placeholder="https://…" />
      </label>
      <label class="field" for="dep-link">
        <span>{{ t('catalog.link') }}</span>
        <InputText id="dep-link" v-model="draft.link_url" name="link_url" autocomplete="off" fluid
          placeholder="https://…" />
      </label>
      <label class="field" for="dep-sort">
        <span>{{ t('catalog.sortOrder') }}</span>
        <InputNumber input-id="dep-sort" v-model="draft.sort_order" :use-grouping="false" fluid />
      </label>

      <Message v-if="dialogError" severity="error" :closable="false">{{ dialogError }}</Message>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="dialogVisible = false" />
      <Button :label="editing ? t('common.save') : t('common.create')" :loading="saving" @click="submit" />
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import Plus from '@primeicons/vue/plus'
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

// 已发布依赖：全量列表 + 搜索/筛选/排除/按类型分类 + 基础 CRUD（catalog.write 才可改）
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface DependencyLanguage {
  sid: string
  name: string
  slug: string
  isPrimary: boolean
}

interface DependencyRow {
  sid: string
  slug: string
  name: string
  kind: string
  intro: string
  logo_url: string | null
  link_url: string | null
  sort_order: number
  created_at: string
  usage_count: number
  languages: DependencyLanguage[]
  language_text: string
}

const { user } = useAdminAuth()
const { t, restoreLocale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()

onMounted(restoreLocale)

const canWrite = computed(() => user.value?.permissions.includes('catalog.write') ?? false)

const { data, pending, refresh } = await useFetch<{ dependencies: DependencyRow[] }>('/api/dashboard/dependencies')
const { data: languageData } = await useFetch<{ languages: { sid: string, name: string }[] }>('/api/dashboard/languages')

const dependencies = computed(() => data.value?.dependencies ?? [])
const selection = ref<DependencyRow[]>([])

const kindOptions = computed(() =>
  (['framework', 'library', 'tool', 'runtime'] as const).map(kind => ({
    label: t(`kind.${kind}`),
    value: kind
  })))

const languageOptions = computed(() =>
  (languageData.value?.languages ?? [])
    .map(language => ({ label: language.name, value: language.sid }))
    .sort((a, b) => a.label.localeCompare(b.label)))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'name', header: t('catalog.name'), width: '15rem' },
  { field: 'kind', header: t('dependencies.kind'), type: 'enum', options: kindOptions.value, matchMode: 'equals',
    groupable: true, width: '8rem' },
  { field: 'language_text', header: t('dependencies.languages'), width: '16rem', matchMode: 'contains' },
  { field: 'usage_count', header: t('dependencies.col.usage'), type: 'number', dataType: 'numeric', width: '7rem',
    align: 'right', matchMode: 'equals', defaultHidden: true },
  { field: 'intro', header: t('catalog.intro'), sortable: false, width: '16rem' },
  { field: 'link_url', header: t('catalog.link'), sortable: false, width: '7rem' },
  { field: 'sort_order', header: t('catalog.sortOrder'), type: 'number', dataType: 'numeric', width: '6rem',
    align: 'right', defaultHidden: true },
  { field: 'created_at', header: t('catalog.createdAt'), type: 'date', width: '11rem',
    defaultHidden: true },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', sortable: false, width: '8rem',
    frozen: true, frozenAlign: 'right' }
])

const busy = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const dialogError = ref('')
const editing = ref(false)
const draft = ref({
  sid: '',
  slug: '',
  name: '',
  kind: 'library',
  language_sids: [] as string[],
  intro: '',
  logo_url: '',
  link_url: '',
  sort_order: 0
})

function notify(severity: 'success' | 'error', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3000 })
}

function apiError(err: unknown, fallbackKey: string) {
  const e = err as { statusCode?: number, statusMessage?: string }
  if (e.statusCode === 403) return t('catalog.noWrite')
  return e.statusMessage ?? t(fallbackKey)
}

function openCreate() {
  draft.value = {
    sid: '',
    slug: '',
    name: '',
    kind: 'library',
    language_sids: [],
    intro: '',
    logo_url: '',
    link_url: '',
    sort_order: 0
  }
  dialogError.value = ''
  editing.value = false
  dialogVisible.value = true
}

function openEdit(row: DependencyRow) {
  draft.value = {
    sid: row.sid,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    language_sids: (row.languages ?? []).map(language => language.sid),
    intro: row.intro ?? '',
    logo_url: row.logo_url ?? '',
    link_url: row.link_url ?? '',
    sort_order: Number(row.sort_order ?? 0)
  }
  dialogError.value = ''
  editing.value = true
  dialogVisible.value = true
}

async function submit() {
  if (saving.value) return
  saving.value = true
  dialogError.value = ''
  try {
    const body = { ...draft.value }
    if (editing.value) await $fetch(`/api/dashboard/dependencies/${draft.value.sid}`, { method: 'PATCH', body })
    else await $fetch('/api/dashboard/dependencies', { method: 'POST', body })
    dialogVisible.value = false
    await refresh()
    notify('success', t(editing.value ? 'toast.dependencyUpdated' : 'toast.dependencyCreated'))
  } catch (err) {
    const e = err as { data?: { data?: { field?: string } } }
    const field = e.data?.data?.field
    const message = apiError(err, 'common.tryAgain')
    if (field && field !== 'sort_order') dialogError.value = message
    else notify('error', t('toast.dependencySaveFailed'), message)
  } finally {
    saving.value = false
  }
}

function askRemoveMany(rows: DependencyRow[]) {
  if (busy.value || !rows.length) return
  confirm.require({
    header: t('dependencies.remove.header', { count: rows.length }),
    message: t('dependencies.remove.message', { names: rows.map(row => row.name).join(', ') }),
    acceptLabel: t('sec.remove'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      busy.value = true
      let done = 0
      let failure = ''
      for (const row of rows) {
        try {
          await $fetch(`/api/dashboard/dependencies/${row.sid}`, { method: 'DELETE' })
          done++
        } catch (err) {
          failure = apiError(err, 'common.tryAgain')
          break
        }
      }
      selection.value = []
      await refresh()
      busy.value = false
      if (done) notify('success', t('toast.dependencyRemoved', { count: done }))
      if (failure) notify('error', t('toast.dependencyRemoveFailed'), failure)
    }
  })
}

useHead({
  title: () => t('title.dependencies'),
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

.cell-main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.cell-logo {
  width: 1.6rem;
  height: 1.6rem;
  object-fit: contain;
  flex-shrink: 0;
}

.cell-title {
  display: block;
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

.cell-intro {
  display: block;
  max-width: 30rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.cell-link {
  color: var(--p-text-color);
  font-size: 0.85rem;
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
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
