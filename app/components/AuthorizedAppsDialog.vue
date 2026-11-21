<template>
  <Dialog v-model:visible="visible" modal :draggable="false" header="Authorized applications"
    :style="{ width: '34rem' }">
    <p v-if="loading" class="oauth-empty">Loading…</p>
    <template v-else-if="applications.length">
      <ul class="oauth-list">
        <li v-for="app in applications" :key="app.appSid" class="oauth-item">
          <div class="oauth-app">
            <img v-if="app.iconUrl && !failedIcons.has(app.appSid)" :src="app.iconUrl" :alt="`${app.name} logo`"
              class="oauth-icon" @error="failedIcons.add(app.appSid)" />
            <span v-else class="oauth-icon oauth-icon--fallback" aria-hidden="true">
              {{ (app.name || '?').charAt(0).toUpperCase() }}
            </span>
            <div class="oauth-info">
              <span class="oauth-name">{{ app.name }}</span>
              <span class="oauth-meta">Authorized {{ formatDate(app.authorizedAt) }}</span>
              <span class="oauth-scopes">
                {{ app.scopes.length ? `Access: ${app.scopes.map(scopeLabel).join(', ')}` : 'No scopes requested' }}
              </span>
            </div>
          </div>
          <Button label="Revoke" severity="danger" outlined size="small" :loading="revokingApp === app.appSid"
            :disabled="Boolean(revokingApp)" @click="askRevoke(app)" />
        </li>
      </ul>
    </template>
    <p v-else-if="!error" class="oauth-empty">No authorized applications.</p>

    <small v-if="error" class="oauth-error" role="alert">{{ error }}</small>

    <div v-if="total > 0" class="oauth-pagination">
      <span class="oauth-total">{{ total }} application{{ total === 1 ? '' : 's' }}</span>
      <Paginator v-if="pageCount > 1" :first="(page - 1) * pageSize" :rows="pageSize" :total="total"
        :page-link-size="5" template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        @page="onPage" />
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" text @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { PageState } from 'primevue/paginator'

interface OAuthAuthorization {
  appSid: string
  name: string
  iconUrl: string | null
  scopes: string[]
  authorizedAt: string
}

interface AuthorizationsPage {
  applications: OAuthAuthorization[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  hasMore: boolean
}

const emit = defineEmits<{ changed: [total: number] }>()
const visible = defineModel<boolean>({ default: false })
const confirm = useConfirm()
const toast = useToast()

const applications = ref<OAuthAuthorization[]>([])
const failedIcons = reactive(new Set<string>())
const loading = ref(false)
const error = ref('')
const revokingApp = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageCount = ref(1)
const total = ref(0)
let loadRequest = 0

async function load() {
  const request = ++loadRequest
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<AuthorizationsPage>('/api/account/oauth/authorizations', {
      query: { page: page.value }
    })
    if (request !== loadRequest) return
    applications.value = res.applications
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
    pageCount.value = res.pageCount
    emit('changed', res.total)
  } catch {
    if (request !== loadRequest) return
    applications.value = []
    error.value = 'Failed to load authorized applications.'
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

watch(visible, open => {
  if (open) {
    failedIcons.clear()
    applications.value = []
    page.value = 1
    void load()
  } else {
    loadRequest++
    loading.value = false
  }
})

function onPage(event: PageState) {
  page.value = event.page + 1
  void load()
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en', { dateStyle: 'medium' })
}

function scopeLabel(value: string) {
  if (value === 'read:user') return 'basic profile'
  if (value === 'read:email') return 'email address'
  return value
}

function askRevoke(app: OAuthAuthorization) {
  if (revokingApp.value) return
  confirm.require({
    header: 'Revoke application access',
    message: `${app.name} will no longer be able to access your account.`,
    acceptLabel: 'Revoke',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      revokingApp.value = app.appSid
      try {
        await $fetch(`/api/account/oauth/authorizations/${encodeURIComponent(app.appSid)}`, { method: 'DELETE' })
        total.value = Math.max(0, total.value - 1)
        emit('changed', total.value)
        toast.add({ severity: 'success', summary: 'Application access revoked', life: 3000 })
        await load()
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Could not revoke access',
          detail: (err as { statusMessage?: string }).statusMessage,
          life: 5000
        })
      } finally {
        revokingApp.value = ''
      }
    }
  })
}
</script>

<style scoped lang="scss">
.oauth-empty {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.oauth-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.oauth-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
}

.oauth-app {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.oauth-icon {
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  object-fit: cover;
  background: var(--p-content-background);
}

.oauth-icon--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color);
  font-size: 1rem;
  font-weight: 600;
}

.oauth-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.oauth-name {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oauth-meta,
.oauth-scopes {
  margin-top: 0.1rem;
  color: var(--p-text-muted-color);
  font-size: 0.78rem;
}

.oauth-item :deep(.p-button) {
  flex: none;
}

.oauth-error {
  display: block;
  margin-top: 0.75rem;
  color: var(--p-red-500);
  font-size: 0.85rem;
}

.oauth-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-content-border-color);
}

.oauth-total {
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
}

.oauth-pagination :deep(.p-paginator) {
  justify-content: flex-end;
  padding: 0;
  background: transparent;
}

@media (max-width: 480px) {
  .oauth-item {
    align-items: flex-start;
  }

  .oauth-pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .oauth-pagination :deep(.p-paginator) {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
