<template>
  <div>
    <div class="keys-head">
      <div>
        <h2 class="section-title">API Keys</h2>
        <p class="keys-lead">
          Create account-level keys for server-to-server access to the BITS Open API. Keys can only manage your own
          snippets and groups; they are not tied to an App.
        </p>
      </div>
      <Button label="New API key" size="small" @click="openCreate">
        <template #icon><Plus /></template>
      </Button>
    </div>

    <section class="group">
      <h3 class="group-title">
        API keys
        <span v-if="total" class="keys-total">{{ total }}</span>
      </h3>

      <div v-if="!apiKeys.length && !pending" class="card">
        <div class="empty-state">
          <Lock aria-hidden="true" />
          <p class="empty-title">No API keys yet</p>
          <p class="empty-desc">Create a key when you are ready to call the Open API.</p>
        </div>
      </div>
      <div v-else class="table-wrap" :class="{ 'is-loading': pending }">
        <table class="keys-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Permissions</th>
              <th>Last used</th>
              <th>Expires</th>
              <th class="col-date">Created</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in apiKeys" :key="key.sid">
              <td>
                <div class="key-name-row">
                  <span class="key-name">{{ key.name }}</span>
                  <span class="key-status" :class="`key-status--${key.status}`">{{ key.status }}</span>
                </div>
              </td>
              <td><code class="key-prefix">{{ key.keyPrefix }}…</code></td>
              <td>
                <div class="permission-list">
                  <span v-for="permission in key.permissions" :key="permission" class="permission">
                    {{ permissionLabel(permission) }}
                  </span>
                </div>
              </td>
              <td class="muted">{{ key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'Never' }}</td>
              <td class="muted">{{ key.expiresAt ? formatDateTime(key.expiresAt) : 'Never' }}</td>
              <td class="col-date">{{ formatDate(key.createdAt) }}</td>
              <td class="col-actions">
                <Button label="Revoke" size="small" severity="danger" text
                  :disabled="Boolean(revokingSid)" @click="askRevoke(key)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <ConfirmDialog />

  <Dialog v-model:visible="createOpen" modal :draggable="false" header="New API key"
    :style="{ width: '34rem', maxWidth: '94vw' }">
    <div class="dialog-form">
      <label class="field" for="key-name">
        <span>Name</span>
        <InputText id="key-name" v-model="form.name" maxlength="80" autocomplete="off"
          placeholder="Production integration" fluid />
      </label>

      <fieldset class="permission-field">
        <legend>Permissions</legend>
        <p class="field-hint">Access is limited to your own content.</p>
        <div class="permission-options">
          <label v-for="permission in PERMISSIONS" :key="permission.value" class="check-field"
            :for="`permission-${permission.value.replace(':', '-')}`">
            <Checkbox :input-id="`permission-${permission.value.replace(':', '-')}`" v-model="form.permissions"
              :value="permission.value" :binary="false" />
            <span>
              <strong>{{ permission.label }}</strong>
              <small>{{ permission.description }}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <label class="field" for="key-expiry">
        <span>Expires</span>
        <Select id="key-expiry" v-model="form.expiry" :options="EXPIRY_OPTIONS" option-label="label"
          option-value="value" fluid />
      </label>

      <p v-if="dialogError" class="dialog-error" role="alert">{{ dialogError }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="createOpen = false" />
      <Button label="Create key" :loading="creating" :disabled="!valid || creating" @click="submitCreate" />
    </template>
  </Dialog>

  <Dialog v-model:visible="createdOpen" modal :draggable="false" header="API key created"
    :style="{ width: '38rem', maxWidth: '94vw' }" :closable="true" @hide="clearCreatedKey">
    <div class="created-key">
      <p class="created-warning">
        Copy this key now. It is shown only once and cannot be recovered after you close this dialog.
      </p>
      <label class="field" for="created-key-value">
        <span>{{ createdName }}</span>
        <div class="key-copy-row">
          <InputText id="created-key-value" :model-value="createdKey" readonly autocomplete="off" spellcheck="false" fluid />
          <Button label="Copy" severity="secondary" outlined @click="copyCreatedKey" />
        </div>
      </label>
      <p class="field-hint">Use it as <code>Authorization: Bearer YOUR_KEY</code> or in the
        <code>X-API-Key</code> header.</p>
    </div>
    <template #footer>
      <Button label="Done" @click="createdOpen = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Lock from '@primeicons/vue/lock'
import Plus from '@primeicons/vue/plus'

type ApiKeyPermission = 'content:read' | 'content:create' | 'content:update' | 'content:delete'

interface DeveloperApiKey {
  sid: string
  name: string
  keyPrefix: string
  permissions: ApiKeyPermission[]
  expiresAt: string | null
  status: 'active' | 'expired'
  lastUsedAt: string | null
  createdAt: string
}

interface KeyForm {
  name: string
  permissions: ApiKeyPermission[]
  expiry: number
}

const PERMISSIONS: { value: ApiKeyPermission, label: string, description: string }[] = [
  { value: 'content:read', label: 'Read content', description: 'List and read your snippets and groups.' },
  { value: 'content:create', label: 'Create content', description: 'Create new snippets and groups.' },
  { value: 'content:update', label: 'Update content', description: 'Edit your snippets and groups.' },
  { value: 'content:delete', label: 'Delete content', description: 'Soft-delete your snippets and groups.' }
]

const EXPIRY_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '365 days', value: 365 },
  { label: 'Never', value: 0 }
]

const toast = useToast()
const confirm = useConfirm()
const createOpen = ref(false)
const createdOpen = ref(false)
const creating = ref(false)
const revokingSid = ref('')
const dialogError = ref('')
const createdKey = ref('')
const createdName = ref('')

function blankForm(): KeyForm {
  return { name: '', permissions: ['content:read'], expiry: 90 }
}

const form = ref<KeyForm>(blankForm())

const { data, refresh, pending } = await useFetch<{ apiKeys: DeveloperApiKey[], total: number }>(
  '/api/developer/api-keys'
)

const apiKeys = computed(() => data.value?.apiKeys ?? [])
const total = computed(() => data.value?.total ?? 0)

const valid = computed(() => {
  const name = form.value.name.trim()
  return !!name && name.length <= 80 && form.value.permissions.length > 0
})

function openCreate() {
  form.value = blankForm()
  dialogError.value = ''
  createOpen.value = true
}

function permissionLabel(permission: ApiKeyPermission) {
  return {
    'content:read': 'Read',
    'content:create': 'Create',
    'content:update': 'Update',
    'content:delete': 'Delete'
  }[permission]
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en', { dateStyle: 'medium' })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })
}

async function submitCreate() {
  if (!valid.value || creating.value) return
  creating.value = true
  dialogError.value = ''
  try {
    const res = await $fetch<{ apiKey: DeveloperApiKey, key: string }>('/api/developer/api-keys', {
      method: 'POST',
      body: {
        name: form.value.name.trim(),
        permissions: form.value.permissions,
        expiresInDays: form.value.expiry || null
      }
    })
    createdKey.value = res.key
    createdName.value = res.apiKey.name
    createOpen.value = false
    createdOpen.value = true
    form.value = blankForm()
    await refresh()
    toast.add({ severity: 'success', summary: 'API key created', life: 3000 })
  } catch (err) {
    dialogError.value = (err as { statusMessage?: string }).statusMessage ?? 'Could not create the API key.'
  } finally {
    creating.value = false
  }
}

async function copyCreatedKey() {
  try {
    await navigator.clipboard.writeText(createdKey.value)
    toast.add({ severity: 'success', summary: 'API key copied', life: 2500 })
  } catch {
    toast.add({ severity: 'error', summary: 'Could not copy the API key', life: 4000 })
  }
}

function clearCreatedKey() {
  createdKey.value = ''
  createdName.value = ''
}

function askRevoke(key: DeveloperApiKey) {
  if (revokingSid.value) return
  confirm.require({
    header: 'Revoke API key',
    message: `Revoke ${key.name}? Applications using this key will stop working immediately.`,
    acceptLabel: 'Revoke key',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      revokingSid.value = key.sid
      try {
        await $fetch(`/api/developer/api-keys/${encodeURIComponent(key.sid)}`, { method: 'DELETE' })
        await refresh()
        toast.add({ severity: 'success', summary: 'API key revoked', life: 3000 })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Could not revoke the API key',
          detail: (err as { statusMessage?: string }).statusMessage,
          life: 5000
        })
      } finally {
        revokingSid.value = ''
      }
    }
  })
}

useHead({ title: 'API Keys' })
</script>

<style scoped lang="scss">
.keys-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;

  .section-title {
    margin: 0;
  }
}

.keys-lead {
  margin: 0.4rem 0 0;
  max-width: 44rem;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.keys-total {
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

.keys-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 0.86rem;

  th,
  td {
    padding: 0.72rem 0.85rem;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: var(--panel);
    font-size: 0.72rem;
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

.key-name {
  font-weight: 500;
}

.key-name-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.key-status {
  padding: 0.08rem 0.38rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 500;
  line-height: 1.4;
  text-transform: capitalize;

  &--active {
    color: var(--p-green-600, #16a34a);
  }

  &--expired {
    color: var(--p-text-muted-color);
    text-decoration: line-through;
  }
}

.key-prefix {
  font-family: var(--font-code);
  font-size: 0.76rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-width: 11rem;
}

.permission {
  padding: 0.08rem 0.36rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.68rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.muted {
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.col-date {
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.col-actions {
  text-align: right;
  white-space: nowrap;
}

.inline-link {
  color: var(--p-primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.dialog-form,
.created-key {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.field-hint {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.5;
}

.permission-field {
  margin: 0;
  padding: 0;
  border: 0;

  legend {
    margin-bottom: 0.2rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--p-text-muted-color);
  }
}

.permission-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.55rem;
}

.check-field {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.65rem;
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: 0.8rem;
  color: var(--p-text-color);
  cursor: pointer;

  strong,
  small {
    display: block;
  }

  strong {
    font-weight: 500;
  }

  small {
    margin-top: 0.15rem;
    font-size: 0.7rem;
    line-height: 1.4;
    color: var(--p-text-muted-color);
  }
}

.created-warning {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-left: 2px solid #d97706;
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, #d97706 8%, transparent);
  font-size: 0.82rem;
  line-height: 1.6;
}

.key-copy-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;

  :deep(.p-inputtext) {
    flex: 1;
    font-family: var(--font-code);
    font-size: 0.76rem;
  }
}

.created-key code {
  padding: 0.08rem 0.25rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--p-text-color) 7%, transparent);
  font-family: var(--font-code);
  color: var(--p-text-color);
}

.dialog-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}

@media screen and (max-width: 640px) {
  .permission-options {
    grid-template-columns: minmax(0, 1fr);
  }

  .keys-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
