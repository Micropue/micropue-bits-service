<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('title.developerApiKeys') }}</h2>
        <p class="page-sub">
          {{ t('developer.apiKeys.summary', { total, active }) }}
        </p>
        <p v-if="total > rows.length" class="page-note">
          {{ t('developer.apiKeys.truncated', { shown: rows.length, total }) }}
        </p>
      </div>
    </header>

    <ConsoleDataTable :value="rows" :columns="columns" data-key="sid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['name', 'sid', 'ownerLabel', 'keyPrefix', 'permissionText']"
      @refresh="refresh">
      <template #cell-name="{ row }">
        <div class="cell-stack">
          <span class="cell-title">{{ row.name }}</span>
          <span class="cell-sub">{{ row.sid }}</span>
        </div>
      </template>

      <template #cell-ownerLabel="{ row }">
        <div class="cell-stack">
          <span>@{{ row.owner.username }}</span>
          <span class="cell-sub">{{ row.owner.email }}</span>
        </div>
      </template>

      <template #cell-keyPrefix="{ row }">
        <code class="cell-code">{{ row.keyPrefix }}…</code>
      </template>

      <template #cell-permissionText="{ row }">
        <div class="permission-list">
          <span v-for="permission in permissionsOf(row)" :key="permission" class="permission">
            {{ permissionLabel(permission) }}
          </span>
        </div>
      </template>

      <template #cell-status="{ row }">
        <StatusTag :label="statusLabel(row.status)" :status="row.status"
          :severity="row.status === 'active' ? 'secondary' : row.status === 'expired' ? 'warn' : 'danger'" />
      </template>

      <template #cell-lastUsedAt="{ row }">
        <span :class="{ 'cell-muted': !row.lastUsedAt }">
          {{ row.lastUsedAt ? formatDateTime(String(row.lastUsedAt)) : t('developer.value.never') }}
        </span>
      </template>

      <template #cell-expiresAt="{ row }">
        <span :class="{ 'cell-muted': !row.expiresAt }">
          {{ row.expiresAt ? formatDateTime(String(row.expiresAt)) : t('developer.value.never') }}
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div v-if="advanced" class="cell-actions">
          <Button v-if="row.status === 'active'" :label="t('developer.revoke')" severity="danger" text size="small"
            :loading="busy === row.sid" :disabled="!!busy" @click="askRevoke(row)" />
          <span v-else class="cell-muted">—</span>
        </div>
        <span v-else class="cell-muted">—</span>
      </template>
    </ConsoleDataTable>
  </div>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface AdminApiKey {
  sid: string
  name: string
  keyPrefix: string
  permissions: string[]
  status: 'active' | 'expired' | 'revoked'
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  owner: { uuid: string, email: string, username: string }
}

const { t, locale, restoreLocale } = useConsoleI18n()
const { advanced, requireAdvanced } = useAdminAdvanced()
const toast = useToast()
const confirm = useConfirm()
const busy = ref('')

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{
  apiKeys: AdminApiKey[]
  total: number
  active: number
  limit: number
}>('/api/dashboard/developer/api-keys')

const total = computed(() => data.value?.total ?? 0)
const active = computed(() => data.value?.active ?? 0)
const rows = computed(() => (data.value?.apiKeys ?? []).map(key => ({
  ...key,
  ownerLabel: `@${key.owner.username} ${key.owner.email}`,
  permissionText: key.permissions.map(permissionLabel).join(', ')
})))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'name', header: t('developer.col.keyName'), width: '15rem' },
  { field: 'ownerLabel', header: t('developer.col.owner'), width: '18rem' },
  { field: 'keyPrefix', header: t('developer.col.keyPrefix'), width: '13rem' },
  {
    field: 'permissionText',
    header: t('developer.col.permissions'),
    width: '15rem',
    sortable: false
  },
  {
    field: 'status',
    header: t('developer.col.status'),
    type: 'enum',
    options: [
      { label: t('developer.status.active'), value: 'active' },
      { label: t('developer.status.expired'), value: 'expired' },
      { label: t('developer.status.revoked'), value: 'revoked' }
    ],
    width: '9rem',
    matchMode: 'equals',
    groupable: true
  },
  { field: 'lastUsedAt', header: t('developer.col.lastUsed'), width: '12rem', sortable: false },
  { field: 'expiresAt', header: t('developer.col.expires'), width: '12rem', sortable: false },
  { field: 'createdAt', header: t('developer.col.created'), type: 'date', width: '11rem' },
  { field: 'actions', header: t('catalog.actions'), type: 'actions', width: '9rem', frozen: true, frozenAlign: 'right' }
])

function permissionsOf(row: Record<string, unknown>) {
  return Array.isArray(row.permissions) ? row.permissions.map(permission => String(permission)) : []
}

function permissionLabel(permission: string) {
  return {
    'content:read': t('developer.permission.read'),
    'content:create': t('developer.permission.create'),
    'content:update': t('developer.permission.update'),
    'content:delete': t('developer.permission.delete')
  }[permission] ?? permission
}

function statusLabel(status: unknown) {
  if (status === 'expired') return t('developer.status.expired')
  if (status === 'revoked') return t('developer.status.revoked')
  return t('developer.status.active')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
}

function notify(severity: 'success' | 'error', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3000 })
}

async function askRevoke(key: Record<string, unknown>) {
  if (busy.value) return
  if (!(await requireAdvanced())) return
  confirm.require({
    header: t('developer.confirm.revokeKeyHeader'),
    message: t('developer.confirm.revokeKey', {
      name: String(key.name),
      owner: `@${(key.owner as AdminApiKey['owner']).username}`
    }),
    acceptLabel: t('developer.revoke'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      busy.value = String(key.sid)
      try {
        await $fetch(`/api/dashboard/developer/api-keys/${encodeURIComponent(String(key.sid))}`, {
          method: 'DELETE'
        })
        await refresh()
        notify('success', t('developer.apiKeyRevoked'))
      } catch (err) {
        notify('error', t('developer.apiKeyRevokeFailed'), (err as { statusMessage?: string }).statusMessage)
      } finally {
        busy.value = ''
      }
    }
  })
}

useHead({
  title: () => t('title.developerApiKeys'),
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

.page-note {
  margin: 0.3rem 0 0;
  font-size: 0.76rem;
  color: var(--p-orange-500, #f59e0b);
}

.cell-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.cell-title {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-sub {
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-code {
  font-family: var(--font-code);
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.permission {
  padding: 0.08rem 0.38rem;
  border: 1px solid var(--dash-border);
  border-radius: 999px;
  font-size: 0.68rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.cell-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.cell-muted {
  color: var(--p-text-muted-color);
}
</style>
