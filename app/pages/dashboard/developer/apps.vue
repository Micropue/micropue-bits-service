<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('title.developerApps') }}</h2>
        <p class="page-sub">
          Developer Apps created by site users. Destructive actions require advanced permission.
        </p>
      </div>
    </header>

    <ConsoleDataTable :value="rows" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['app', 'ownerLabel', 'homepage']" @refresh="refresh">
      <template #cell-app="{ row }">
        <div class="cell-main">
          <span class="cell-icon">
            <img v-if="row.iconUrl && !brokenIcons.has(String(row.sid))" :src="String(row.iconUrl)" alt=""
              width="24" height="24" loading="lazy" @error="markIconBroken(String(row.sid))">
            <Box v-else aria-hidden="true" />
          </span>
          <span class="cell-text">
            <span class="cell-title">{{ row.name }}</span>
            <span class="cell-sub">{{ row.sid }}</span>
          </span>
        </div>
      </template>

      <template #cell-ownerLabel="{ row }">
        <div class="cell-stack">
          <span>@{{ row.owner.username }}</span>
          <span class="cell-sub">{{ row.owner.email }}</span>
        </div>
      </template>

      <template #cell-homepage="{ row }">
        <a class="cell-link" :href="row.homepageUrl" target="_blank" rel="noopener noreferrer">
          {{ hostname(row.homepageUrl) }}
        </a>
      </template>

      <template #cell-serviceStatus="{ row }">
        <StatusTag v-if="row.serviceStatus === 'none'" :label="t('developer.status.none')" status="unbound"
          severity="warn" />
        <StatusTag v-else :label="row.serviceStatus === 'active' ? t('developer.status.active') : t('developer.status.suspended')"
          :status="row.serviceStatus === 'active' ? 'active' : 'disabled'"
          :severity="row.serviceStatus === 'active' ? 'secondary' : 'danger'" />
      </template>

      <template #cell-status="{ row }">
        <StatusTag :label="row.status === 'active' ? t('developer.status.active') : t('developer.status.suspended')"
          :status="row.status === 'active' ? 'active' : 'disabled'"
          :severity="row.status === 'active' ? 'secondary' : 'danger'" />
      </template>

      <template #cell-actions="{ row }">
        <div v-if="advanced" class="cell-actions">
          <Button v-if="row.status === 'active'" :label="t('developer.suspend')" severity="danger" text size="small"
            :loading="busy === `app-${row.sid}`" @click="setAppStatus(row, 'suspended')" />
          <Button v-else :label="t('developer.activate')" severity="secondary" text size="small"
            :loading="busy === `app-${row.sid}`" @click="setAppStatus(row, 'active')" />
          <Button :label="t('common.delete')" severity="danger" text size="small" :disabled="!!busy"
            @click="askDelete(row)" />
        </div>
        <span v-else class="cell-muted">—</span>
      </template>
    </ConsoleDataTable>
  </div>

  <DeveloperDeleteDialog v-model="deleteOpen" :loading="busy.startsWith('delete-app-')"
    :title="t('common.delete')" :message="deleteMessage" :confirm-label="t('common.delete')"
    :cancel-label="t('common.cancel')" @confirm="confirmDelete" />
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface AdminDeveloperApp {
  sid: string
  name: string
  homepageUrl: string
  iconUrl: string | null
  description: string
  status: string
  createdAt: string
  owner: { uuid: string, email: string, username: string }
  service: { appSid: string, status: string } | null
}

const { t, restoreLocale } = useConsoleI18n()
const { advanced, requireAdvanced } = useAdminAdvanced()
const toast = useToast()
const busy = ref('')
const deleteOpen = ref(false)
const deleteTarget = ref<AdminDeveloperApp | null>(null)
const deleteMessage = computed(() => deleteTarget.value
  ? t('developer.confirm.deleteApp', { name: deleteTarget.value.name })
  : '')
const brokenIcons = reactive(new Set<string>())

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{ apps: AdminDeveloperApp[] }>('/api/dashboard/developer/apps')

const rows = computed(() => (data.value?.apps ?? []).map(app => ({
  ...app,
  app: app.name,
  ownerLabel: `@${app.owner.username} ${app.owner.email}`,
  homepage: hostname(app.homepageUrl),
  serviceStatus: app.service?.status ?? 'none'
})))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'app', header: t('developer.col.app'), width: '16rem' },
  { field: 'ownerLabel', header: t('developer.col.owner'), width: '18rem' },
  { field: 'homepage', header: t('developer.col.homepage'), width: '13rem', sortable: false },
  {
    field: 'serviceStatus',
    header: t('developer.col.service'),
    type: 'enum',
    options: [
      { label: t('developer.status.none'), value: 'none' },
      { label: t('developer.status.active'), value: 'active' },
      { label: t('developer.status.suspended'), value: 'suspended' }
    ],
    width: '10rem',
    matchMode: 'equals',
    groupable: true
  },
  {
    field: 'status',
    header: t('developer.col.status'),
    type: 'enum',
    options: [
      { label: t('developer.status.active'), value: 'active' },
      { label: t('developer.status.suspended'), value: 'suspended' }
    ],
    width: '9rem',
    matchMode: 'equals',
    groupable: true
  },
  { field: 'createdAt', header: t('developer.col.created'), type: 'date', width: '11rem' },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', width: '13rem', frozen: true, frozenAlign: 'right' }
])

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function markIconBroken(sid: string) {
  brokenIcons.add(sid)
}

function notify(severity: 'success' | 'error', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3000 })
}

async function setAppStatus(app: AdminDeveloperApp, status: 'active' | 'suspended') {
  if (busy.value) return
  if (status === 'suspended') {
    if (!(await requireAdvanced())) return
  } else if (!advanced.value) return

  busy.value = `app-${app.sid}`
  try {
    await $fetch(`/api/dashboard/developer/apps/${encodeURIComponent(app.sid)}`, {
      method: 'PATCH',
      body: { status }
    })
    await refresh()
    notify('success', status === 'suspended' ? 'App suspended' : 'App activated')
  } catch (err) {
    notify('error', 'Could not update app', (err as { statusMessage?: string }).statusMessage)
  } finally {
    busy.value = ''
  }
}

async function askDelete(app: AdminDeveloperApp) {
  if (busy.value) return
  if (!(await requireAdvanced())) return
  deleteTarget.value = app
  deleteOpen.value = true
}

async function confirmDelete(phrase: string) {
  const app = deleteTarget.value
  if (!app || busy.value) return
  busy.value = `delete-app-${app.sid}`
  try {
    await $fetch(`/api/dashboard/developer/apps/${encodeURIComponent(app.sid)}`, {
      method: 'DELETE',
      body: { phrase }
    })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
    notify('success', 'Developer App deleted')
  } catch (err) {
    notify('error', 'Could not delete app', (err as { statusMessage?: string }).statusMessage)
  } finally {
    busy.value = ''
  }
}

useHead({
  title: () => t('title.developerApps'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
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
  gap: 0.55rem;
  min-width: 10rem;
}

.cell-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  overflow: hidden;
  border: 1px solid var(--dash-border);
  border-radius: 6px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 0.8rem;
    height: 0.8rem;
    opacity: 0.55;
  }
}

.cell-text,
.cell-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.cell-title {
  font-weight: 500;
  white-space: nowrap;
}

.cell-sub {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.cell-link {
  color: var(--p-text-color);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--p-text-color) 30%, transparent);
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 0.1rem;
}

.cell-muted {
  color: var(--p-text-muted-color);
}
</style>
