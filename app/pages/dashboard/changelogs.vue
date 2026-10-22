<template>
  <div class="c-page">
    <header class="c-page-head">
      <div>
        <h2 class="c-page-title">{{ t('changelog.title') }}</h2>
        <p class="c-page-sub">{{ t('changelog.subtitle', { count: entries.length }) }}</p>
      </div>
    </header>

    <ConsoleDataTable :value="entries" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['title', 'body']" @refresh="refresh">
      <template #toolbar>
        <Button :label="t('changelog.new')" size="small" @click="openCreate" />
      </template>

      <template #cell-title="{ row }">
        <div class="c-cell-text">
          <span class="c-cell-title">{{ row.title }}</span>
          <span class="c-cell-sub">{{ excerpt(row.body) }}</span>
        </div>
      </template>

      <template #cell-published="{ row }">
        <StatusTag :label="t(row.published ? 'changelog.published' : 'changelog.draft')"
          :status="row.published ? 'published' : 'draft'" :severity="row.published ? 'secondary' : 'warn'" />
      </template>

      <template #cell-actions="{ row }">
        <div class="c-cell-actions">
          <Button :label="t('content.edit')" severity="secondary" text size="small" @click="openEdit(row)" />
          <Button :label="t('common.delete')" severity="danger" text size="small" @click="askDelete(row)" />
        </div>
      </template>
    </ConsoleDataTable>
  </div>

  <Dialog v-model:visible="dialogVisible" modal :draggable="false" :style="{ width: '42rem' }"
    :header="editing ? t('changelog.edit') : t('changelog.new')">
    <div class="dialog-form">
      <label class="field" for="changelog-title">
        <span>{{ t('changelog.form.title') }}</span>
        <InputText id="changelog-title" v-model="draft.title" maxlength="120" autocomplete="off" fluid />
      </label>
      <label class="field" for="changelog-body">
        <span>{{ t('changelog.form.body') }}</span>
        <Textarea id="changelog-body" v-model="draft.body" rows="12" maxlength="20000" auto-resize fluid />
      </label>
      <div class="dash-row">
        <div class="dash-row-main">
          <span class="dash-row-label">{{ t('changelog.form.publish') }}</span>
          <span class="dash-row-desc">{{ t('changelog.form.publishHint') }}</span>
        </div>
        <ToggleSwitch v-model="draft.published" input-id="changelog-published" :aria-label="t('changelog.form.publish')" />
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="dialogVisible = false" />
      <Button :label="editing ? t('common.save') : t('changelog.publishNow')" :loading="saving"
        :disabled="!draft.title.trim() || !draft.body.trim() || saving" @click="save" />
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, restoreLocale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()
onMounted(restoreLocale)

interface Entry {
  sid: string
  title: string
  body: string
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

const { data, pending, refresh } = await useFetch<{ entries: Entry[] }>('/api/dashboard/changelogs')
const entries = computed(() => data.value?.entries ?? [])

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'title', header: t('changelog.col.title'), width: '24rem' },
  { field: 'published', header: t('changelog.col.status'), width: '8rem' },
  { field: 'publishedAt', header: t('changelog.col.publishedAt'), type: 'date', width: '11rem' },
  { field: 'updatedAt', header: t('changelog.col.updatedAt'), type: 'date', width: '11rem' },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', sortable: false, width: '9rem',
    frozen: true, frozenAlign: 'right' }
])

const dialogVisible = ref(false)
const editing = ref<Entry | null>(null)
const draft = ref({ title: '', body: '', published: false })
const saving = ref(false)
const error = ref('')

function excerpt(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function openCreate() {
  editing.value = null
  draft.value = { title: '', body: '', published: true }
  error.value = ''
  dialogVisible.value = true
}

function openEdit(row: Entry) {
  editing.value = row
  draft.value = { title: row.title, body: row.body, published: row.published }
  error.value = ''
  dialogVisible.value = true
}

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/dashboard/changelogs/${encodeURIComponent(editing.value.sid)}`, {
        method: 'PATCH',
        body: draft.value
      })
      toast.add({ severity: 'success', summary: t('toast.changelogUpdated'), life: 3000 })
    } else {
      await $fetch('/api/dashboard/changelogs', { method: 'POST', body: draft.value })
      toast.add({ severity: 'success', summary: t('toast.changelogCreated'), life: 3000 })
    }
    dialogVisible.value = false
    await refresh()
  } catch (err) {
    error.value = (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain')
  } finally {
    saving.value = false
  }
}

function askDelete(row: Entry) {
  confirm.require({
    header: t('changelog.deleteTitle'),
    message: t('changelog.deleteMessage', { title: row.title }),
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      try {
        await $fetch(`/api/dashboard/changelogs/${encodeURIComponent(row.sid)}`, { method: 'DELETE' })
        await refresh()
        toast.add({ severity: 'success', summary: t('toast.changelogDeleted'), life: 3000 })
      } catch (err) {
        toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? t('common.tryAgain'), life: 5000 })
      }
    }
  })
}

useHead({
  title: () => t('title.changelog'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
@use '../../assets/css/console-content.scss';

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-red-500, #ef4444);
}
</style>
