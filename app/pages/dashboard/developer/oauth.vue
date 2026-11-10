<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('title.developerOAuth') }}</h2>
        <p class="page-sub">
          OAuth services registered by site users. Destructive actions require advanced permission.
        </p>
      </div>
    </header>

    <ConsoleDataTable :value="rows" :columns="columns" data-key="appSid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['app', 'ownerLabel', 'clientId']" @refresh="refresh">
      <template #cell-app="{ row }">
        <div class="cell-main">
          <span class="cell-icon">
            <img v-if="row.iconUrl && !brokenIcons.has(String(row.appSid))" :src="String(row.iconUrl)" alt=""
              width="24" height="24" loading="lazy" @error="markIconBroken(String(row.appSid))">
            <Box v-else aria-hidden="true" />
          </span>
          <span class="cell-title">{{ row.name }}</span>
        </div>
      </template>

      <template #cell-ownerLabel="{ row }">
        <div class="cell-stack">
          <span>@{{ row.owner.username }}</span>
          <span class="cell-sub">{{ row.owner.email }}</span>
        </div>
      </template>

      <template #cell-clientId="{ row }">
        <code class="client-id">{{ row.appSid }}</code>
      </template>

      <template #cell-status="{ row }">
        <StatusTag :label="row.status === 'active' ? t('developer.status.active') : t('developer.status.suspended')"
          :status="row.status === 'active' ? 'active' : 'disabled'"
          :severity="row.status === 'active' ? 'secondary' : 'danger'" />
      </template>

      <template #cell-actions="{ row }">
        <div v-if="advanced" class="cell-actions">
          <Button v-if="row.status === 'active'" :label="t('developer.suspend')" severity="danger" text size="small"
            :loading="busy === `service-${row.appSid}`" @click="setServiceStatus(row, 'suspended')" />
          <Button v-else :label="t('developer.activate')" severity="secondary" text size="small"
            :loading="busy === `service-${row.appSid}`" @click="setServiceStatus(row, 'active')" />
          <Button :label="t('common.delete')" severity="danger" text size="small" :disabled="!!busy"
            @click="askDelete(row)" />
        </div>
        <span v-else class="cell-muted">—</span>
      </template>
    </ConsoleDataTable>
  </div>

  <DeveloperDeleteDialog v-model="deleteOpen" :loading="busy.startsWith('delete-service-')"
    :title="t('common.delete')" :message="deleteMessage" :confirm-label="t('common.delete')"
    :cancel-label="t('common.cancel')" @confirm="confirmDelete" />
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface AdminOAuthService {
  appSid: string
  name: string
  iconUrl: string | null
  status: string
  appStatus: string
  redirectUris: string[]
  allowWildcard: boolean
  deviceFlow: boolean
  expireUserTokens: boolean
  createdAt: string
  owner: { uuid: string, email: string, username: string }
}

const { t, restoreLocale } = useConsoleI18n()
const { advanced, requireAdvanced } = useAdminAdvanced()
const toast = useToast()
const busy = ref('')
const deleteOpen = ref(false)
const deleteTarget = ref<AdminOAuthService | null>(null)
const deleteMessage = computed(() => deleteTarget.value
  ? t('developer.confirm.deleteOAuth', { name: deleteTarget.value.name })
  : '')
const brokenIcons = reactive(new Set<string>())

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{ services: AdminOAuthService[] }>('/api/dashboard/developer/oauth')

const rows = computed(() => (data.value?.services ?? []).map(service => {
  const status = service.status === 'active' && service.appStatus === 'active' ? 'active' : 'suspended'
  return {
    ...service,
    app: service.name,
    ownerLabel: `@${service.owner.username} ${service.owner.email}`,
    clientId: service.appSid,
    redirects: service.redirectUris.length,
    deviceFlow: service.deviceFlow ? 'on' : 'off',
    tokenExpiry: service.expireUserTokens ? 'expires' : 'never',
    status
  }
}))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'app', header: t('developer.col.app'), width: '15rem' },
  { field: 'ownerLabel', header: t('developer.col.owner'), width: '18rem' },
  { field: 'clientId', header: t('developer.col.clientId'), width: '12rem' },
  { field: 'redirects', header: t('developer.col.redirects'), type: 'number', dataType: 'numeric', width: '10rem', align: 'right' },
  {
    field: 'deviceFlow',
    header: t('developer.col.deviceFlow'),
    type: 'enum',
    options: [
      { label: t('developer.status.on'), value: 'on' },
      { label: t('developer.status.off'), value: 'off' }
    ],
    width: '9rem',
    matchMode: 'equals',
    groupable: true
  },
  {
    field: 'tokenExpiry',
    header: t('developer.col.tokenExpiry'),
    type: 'enum',
    options: [
      { label: t('developer.status.expires'), value: 'expires' },
      { label: t('developer.status.never'), value: 'never' }
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

function markIconBroken(appSid: string) {
  brokenIcons.add(appSid)
}

function notify(severity: 'success' | 'error', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3000 })
}

async function setServiceStatus(service: AdminOAuthService, status: 'active' | 'suspended') {
  if (busy.value) return
  if (status === 'suspended') {
    if (!(await requireAdvanced())) return
  } else if (!advanced.value) return

  busy.value = `service-${service.appSid}`
  try {
    await $fetch(`/api/dashboard/developer/oauth/${encodeURIComponent(service.appSid)}`, {
      method: 'PATCH',
      body: { status }
    })
    await refresh()
    notify('success', status === 'suspended' ? 'OAuth service suspended' : 'OAuth service activated')
  } catch (err) {
    notify('error', 'Could not update OAuth service', (err as { statusMessage?: string }).statusMessage)
  } finally {
    busy.value = ''
  }
}

async function askDelete(service: AdminOAuthService) {
  if (busy.value) return
  if (!(await requireAdvanced())) return
  deleteTarget.value = service
  deleteOpen.value = true
}

async function confirmDelete(phrase: string) {
  const service = deleteTarget.value
  if (!service || busy.value) return
  busy.value = `delete-service-${service.appSid}`
  try {
    await $fetch(`/api/dashboard/developer/oauth/${encodeURIComponent(service.appSid)}`, {
      method: 'DELETE',
      body: { phrase }
    })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
    notify('success', 'OAuth service deleted')
  } catch (err) {
    notify('error', 'Could not delete OAuth service', (err as { statusMessage?: string }).statusMessage)
  } finally {
    busy.value = ''
  }
}

useHead({
  title: () => t('title.developerOAuth'),
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

.cell-title {
  font-weight: 500;
  white-space: nowrap;
}

.cell-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.cell-sub {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.client-id {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
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
