<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('languages.title') }}</h2>
        <p class="page-sub">{{ t('languages.subtitle', { count: languages.length }) }}</p>
      </div>
      <Button :label="t('languages.new')" size="small" @click="openCreate">
        <template #icon>
          <Plus aria-hidden="true" />
        </template>
      </Button>
    </header>

    <ConsoleDataTable v-model:selection="selection" :value="languages" :columns="columns" data-key="sid"
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
            @click="askRemove(row)" />
        </div>
      </template>

      <template #bulk="{ selection: rows }">
        <Button :label="t('table.removeSelected')" severity="danger" outlined size="small" :disabled="busy"
          @click="askRemoveMany(rows)" />
      </template>
    </ConsoleDataTable>
  </div>

  <Dialog v-model:visible="dialogVisible" modal :draggable="false" :style="{ width: '34rem' }"
    :header="editing ? t('languages.edit') : t('languages.new')">
    <div class="form">
      <label class="field" for="lang-slug">
        <span>{{ t('catalog.slug') }}</span>
        <InputText id="lang-slug" v-model="draft.slug" name="slug" maxlength="32" autocomplete="off"
          placeholder="typescript" fluid />
      </label>
      <label class="field" for="lang-name">
        <span>{{ t('catalog.name') }}</span>
        <InputText id="lang-name" v-model="draft.name" name="name" maxlength="64" autocomplete="off" fluid />
      </label>
      <label class="field" for="lang-intro">
        <span>{{ t('catalog.intro') }}</span>
        <Textarea id="lang-intro" v-model="draft.intro" name="intro" rows="3" maxlength="500" auto-resize fluid />
      </label>
      <label class="field" for="lang-logo">
        <span>{{ t('catalog.logo') }}</span>
        <InputText id="lang-logo" v-model="draft.logo_url" name="logo_url" autocomplete="off" fluid
          placeholder="https://…" />
      </label>
      <label class="field" for="lang-link">
        <span>{{ t('catalog.link') }}</span>
        <InputText id="lang-link" v-model="draft.link_url" name="link_url" autocomplete="off" fluid
          placeholder="https://…" />
      </label>
      <label class="field" for="lang-sort">
        <span>{{ t('catalog.sortOrder') }}</span>
        <InputNumber input-id="lang-sort" v-model="draft.sort_order" :use-grouping="false" fluid />
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

// 已发布语言：全量列表 + 搜索/筛选/排除/分类 + 基础 CRUD
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface LanguageRow {
  sid: string
  slug: string
  name: string
  logo_url: string | null
  intro: string
  link_url: string | null
  sort_order: number
  created_at: string
  dependency_count: number
  content_count: number
}

const { t, locale, restoreLocale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{ languages: LanguageRow[] }>('/api/dashboard/languages')
const languages = computed(() => data.value?.languages ?? [])
const selection = ref<LanguageRow[]>([])

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'name', header: t('catalog.name'), width: '16rem' },
  { field: 'dependency_count', header: t('languages.col.dependencies'), type: 'number', dataType: 'numeric',
    width: '7rem', align: 'right', matchMode: 'equals' },
  { field: 'content_count', header: t('languages.col.snippets'), type: 'number', dataType: 'numeric',
    width: '7rem', align: 'right', matchMode: 'equals' },
  { field: 'intro', header: t('catalog.intro'), sortable: false, width: '18rem' },
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
  draft.value = { sid: '', slug: '', name: '', intro: '', logo_url: '', link_url: '', sort_order: 0 }
  dialogError.value = ''
  editing.value = false
  dialogVisible.value = true
}

function openEdit(row: LanguageRow) {
  draft.value = {
    sid: row.sid,
    slug: row.slug,
    name: row.name,
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
    if (editing.value) await $fetch(`/api/dashboard/languages/${draft.value.sid}`, { method: 'PATCH', body })
    else await $fetch('/api/dashboard/languages', { method: 'POST', body })
    dialogVisible.value = false
    await refresh()
    notify('success', t(editing.value ? 'toast.languageUpdated' : 'toast.languageCreated'))
  } catch (err) {
    const e = err as { data?: { data?: { field?: string } } }
    const field = e.data?.data?.field
    const message = apiError(err, 'common.tryAgain')
    // 唯一键/格式错误跟字段走，留在弹窗里提示
    if (field && field !== 'sort_order') dialogError.value = message
    else notify('error', t('toast.languageSaveFailed'), message)
  } finally {
    saving.value = false
  }
}

function askRemove(row: LanguageRow) {
  askRemoveMany([row])
}

function askRemoveMany(rows: LanguageRow[]) {
  if (busy.value || !rows.length) return
  const names = rows.map(row => row.name).join(', ')
  confirm.require({
    header: t('languages.remove.header', { count: rows.length }),
    message: t('languages.remove.message', { names }),
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
          await $fetch(`/api/dashboard/languages/${row.sid}`, { method: 'DELETE' })
          done++
        } catch (err) {
          failure = apiError(err, 'common.tryAgain')
          break
        }
      }
      selection.value = []
      await refresh()
      busy.value = false
      if (done) notify('success', t('toast.languageRemoved', { count: done }))
      if (failure) notify('error', t('toast.languageRemoveFailed'), failure)
    }
  })
}

useHead({
  title: () => t('title.languages'),
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

.cell-intro {
  display: block;
  max-width: 32rem;
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
</style>
