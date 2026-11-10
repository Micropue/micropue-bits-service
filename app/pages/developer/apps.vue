<template>
  <div>
    <div class="apps-head">
      <div>
        <h2 class="section-title">Apps</h2>
        <p class="apps-lead">
          OAuth applications that can request access to your BITS account. OAuth settings are registered separately
          under <NuxtLink to="/developer/oauth" class="inline-link">OAuth</NuxtLink>.
        </p>
      </div>
      <Button label="New app" size="small" @click="openDialog">
        <template #icon><Plus /></template>
      </Button>
    </div>

    <section class="group">
      <h3 class="group-title">
        Your applications
        <span v-if="total" class="apps-total">{{ total }}</span>
      </h3>

      <div v-if="!apps.length" class="card">
        <div class="empty-state">
          <Box aria-hidden="true" />
          <p class="empty-title">No applications yet</p>
          <p class="empty-desc">Create an app to connect an external service to your BITS account.</p>
        </div>
      </div>
      <div v-else class="table-wrap" :class="{ 'is-loading': pending }">
        <table class="app-table">
          <thead>
            <tr>
              <th>App</th>
              <th>Homepage</th>
              <th>Description</th>
              <th class="col-date">Created</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="app in apps" :key="app.sid">
              <td>
                <div class="app-cell">
                  <span class="app-icon" :class="{ 'app-icon--fallback': !app.iconUrl || brokenIcons.has(app.sid) }">
                    <img v-if="app.iconUrl && !brokenIcons.has(app.sid)" :src="app.iconUrl" alt="" width="28"
                      height="28" loading="lazy" @error="markIconBroken(app.sid)">
                    <Box v-else aria-hidden="true" />
                  </span>
                  <span class="cell-name">{{ app.name }}</span>
                  <span v-if="app.status === 'suspended'" class="suspended">Suspended</span>
                </div>
              </td>
              <td class="cell-link">
                <a :href="app.homepageUrl" target="_blank" rel="noopener noreferrer"
                  :title="app.homepageUrl">{{ hostname(app.homepageUrl) }}</a>
              </td>
              <td class="cell-desc">{{ app.description }}</td>
              <td class="col-date">{{ formatDate(app.createdAt) }}</td>
              <td class="col-actions">
                <Button label="Edit" size="small" severity="secondary" text @click="openEdit(app)" />
                <Button label="Delete" size="small" severity="danger" text
                  @click="askDelete(app)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > PAGE_SIZE" class="apps-pagination">
        <span class="apps-count">{{ total }} applications</span>
        <div class="apps-pager">
          <Button label="Previous" size="small" severity="secondary" outlined :disabled="page <= 1 || pending"
            @click="setPage(page - 1)" />
          <span class="apps-page-label">Page {{ page }} / {{ totalPages }}</span>
          <Button label="Next" size="small" severity="secondary" outlined :disabled="page >= totalPages || pending"
            @click="setPage(page + 1)" />
        </div>
      </div>
    </section>
  </div>

  <Dialog v-model:visible="dialogVisible" modal :draggable="false" :style="{ width: '32rem' }"
    :header="dialogHeader">
    <div class="dialog-form">
      <label class="field" for="app-name">
        <span>Application name</span>
        <InputText id="app-name" v-model="form.name" maxlength="80" autocomplete="off" fluid />
      </label>
      <label class="field" for="app-homepage">
        <span>Homepage URL</span>
        <InputText id="app-homepage" v-model="form.homepageUrl" type="url" maxlength="512" autocomplete="off"
          placeholder="https://example.com" fluid />
      </label>
      <label class="field" for="app-icon">
        <span>Icon URL <span class="optional">(optional)</span></span>
        <InputText id="app-icon" v-model="form.iconUrl" type="url" maxlength="512" autocomplete="off"
          placeholder="https://example.com/icon.png" fluid />
      </label>
      <label class="field" for="app-description">
        <span>Application description</span>
        <Textarea id="app-description" v-model="form.description" rows="4" maxlength="500" auto-resize fluid />
      </label>

      <p v-if="dialogError" class="dialog-error" role="alert">{{ dialogError }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="dialogVisible = false" />
      <Button :label="submitLabel" :loading="saving" :disabled="!valid || saving" @click="submit" />
    </template>
  </Dialog>

  <DeveloperDeleteDialog v-model="deleteOpen" :loading="deleting" title="Delete app"
    :message="deleteMessage" @confirm="confirmDelete" />
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import Plus from '@primeicons/vue/plus'

interface DeveloperApp {
  sid: string
  name: string
  homepageUrl: string
  iconUrl: string | null
  description: string
  status: string
  createdAt: string
}

interface AppForm {
  name: string
  homepageUrl: string
  iconUrl: string
  description: string
}

const PAGE_SIZE = 20
const page = ref(1)
const toast = useToast()
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteTarget = ref<DeveloperApp | null>(null)
const deleteMessage = computed(() => deleteTarget.value
  ? `Delete ${deleteTarget.value.name} and its OAuth service and tokens? This cannot be undone.`
  : '')

const { data, refresh, pending } = await useFetch<{ apps: DeveloperApp[], total: number }>('/api/developer/apps', {
  query: computed(() => ({ limit: PAGE_SIZE, offset: (page.value - 1) * PAGE_SIZE }))
})
const apps = computed(() => data.value?.apps ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editingSid = ref('')
const brokenIcons = reactive(new Set<string>())

function blankForm(): AppForm {
  return { name: '', homepageUrl: '', iconUrl: '', description: '' }
}

const form = ref<AppForm>(blankForm())

const dialogHeader = computed(() => (editingSid.value ? 'Edit app' : 'New app'))
const submitLabel = computed(() => (editingSid.value ? 'Save changes' : 'Create app'))

const URL_RE = /^https?:\/\/[^\s]+$/i
const valid = computed(() => {
  const name = form.value.name.trim()
  const homepage = form.value.homepageUrl.trim()
  const icon = form.value.iconUrl.trim()
  const description = form.value.description.trim()
  return !!name && name.length <= 80 &&
    !!homepage && homepage.length <= 512 && URL_RE.test(homepage) &&
    (!icon || (icon.length <= 512 && URL_RE.test(icon))) &&
    !!description && description.length <= 500
})

function openDialog() {
  editingSid.value = ''
  form.value = blankForm()
  dialogError.value = ''
  dialogVisible.value = true
}

function openEdit(app: DeveloperApp) {
  editingSid.value = app.sid
  form.value = {
    name: app.name,
    homepageUrl: app.homepageUrl,
    iconUrl: app.iconUrl ?? '',
    description: app.description
  }
  dialogError.value = ''
  dialogVisible.value = true
}

function setPage(next: number) {
  page.value = Math.min(Math.max(next, 1), totalPages.value)
}

function markIconBroken(sid: string) {
  brokenIcons.add(sid)
}

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

async function submit() {
  if (!valid.value || saving.value) return
  saving.value = true
  dialogError.value = ''
  const editing = editingSid.value
  try {
    await $fetch(editing ? `/api/developer/apps/${encodeURIComponent(editing)}` : '/api/developer/apps', {
      method: editing ? 'PATCH' : 'POST',
      body: {
        name: form.value.name.trim(),
        homepageUrl: form.value.homepageUrl.trim(),
        iconUrl: form.value.iconUrl.trim(),
        description: form.value.description.trim()
      }
    })
    dialogVisible.value = false
    if (editing) brokenIcons.delete(editing)
    else page.value = 1
    editingSid.value = ''
    await refresh()
    toast.add({ severity: 'success', summary: editing ? 'App updated' : 'App created', life: 3000 })
  } catch (err) {
    dialogError.value = (err as { statusMessage?: string }).statusMessage ??
      (editing ? 'Could not save changes.' : 'Could not create the app.')
  } finally {
    saving.value = false
  }
}

function askDelete(app: DeveloperApp) {
  if (deleting.value) return
  deleteTarget.value = app
  deleteOpen.value = true
}

async function confirmDelete(phrase: string) {
  const app = deleteTarget.value
  if (!app || deleting.value) return
  deleting.value = true
  try {
    await $fetch(`/api/developer/apps/${encodeURIComponent(app.sid)}`, {
      method: 'DELETE',
      body: { phrase }
    })
    deleteOpen.value = false
    deleteTarget.value = null
    brokenIcons.delete(app.sid)
    if (apps.value.length === 1 && page.value > 1) page.value -= 1
    await refresh()
    toast.add({ severity: 'success', summary: 'App deleted', life: 3000 })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not delete app',
      detail: (err as { statusMessage?: string }).statusMessage,
      life: 5000
    })
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Apps' })
</script>

<style scoped lang="scss">
.apps-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;

  .section-title {
    margin: 0;
  }
}

.apps-lead {
  margin: 0.4rem 0 0;
  max-width: 42rem;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.inline-link {
  color: var(--p-primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.apps-total {
  margin-left: 0.35rem;
  color: var(--p-text-muted-color);
  font-weight: 400;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--p-content-background);
  transition: opacity 0.15s;

  &.is-loading {
    opacity: 0.55;
    pointer-events: none;
  }
}

.app-table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
  font-size: 0.88rem;

  th,
  td {
    padding: 0.7rem 0.9rem;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: var(--panel);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--p-text-muted-color);
    white-space: nowrap;
  }

  tbody tr + tr td {
    border-top: 1px solid var(--border);
  }

  tbody tr:hover {
    background: color-mix(in srgb, var(--p-text-color) 3%, transparent);
  }
}

.app-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 10rem;
}

.cell-name {
  font-weight: 500;
  white-space: nowrap;
}

.suspended {
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: var(--p-red-500, #ef4444);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
}

.app-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--p-content-background);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 0.9rem;
    height: 0.9rem;
    opacity: 0.55;
  }

  &--fallback {
    background: color-mix(in srgb, var(--p-text-color) 6%, var(--p-content-background));
  }
}

.cell-link a {
  color: var(--p-text-color);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--p-text-color) 30%, transparent);
}

.cell-desc {
  max-width: 26rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

.col-date {
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.col-actions {
  text-align: right;
  white-space: nowrap;
}

.apps-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.9rem;
}

.apps-count,
.apps-page-label {
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.apps-pager {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.optional {
  font-weight: 400;
  color: var(--p-text-muted-color);
}

.dialog-form {
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
  color: var(--p-text-muted-color);
}

.dialog-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}

@media screen and (max-width: 600px) {
  .apps-head,
  .apps-pagination {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .apps-pager {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
