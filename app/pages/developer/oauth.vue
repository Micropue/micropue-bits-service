<template>
  <div>
    <div class="oauth-head">
      <div>
        <h2 class="section-title">OAuth</h2>
        <p class="oauth-lead">
          Register OAuth services for your Apps. Each App can have one service.
        </p>
      </div>
      <Button label="Register service" size="small" :disabled="!availableApps.length" @click="openCreate">
        <template #icon><Plus /></template>
      </Button>
    </div>

    <section class="group">
      <h3 class="group-title">
        OAuth services
        <span v-if="services.length" class="service-count">{{ services.length }}</span>
      </h3>

      <div v-if="!services.length" class="card">
        <div class="empty-state">
          <Key aria-hidden="true" />
          <p class="empty-title">No OAuth services yet</p>
          <p class="empty-desc">
            <template v-if="availableApps.length">
              Choose one of your Apps to register an OAuth service.
            </template>
            <template v-else>
              Create an App first, then come back to register OAuth access.
              <NuxtLink to="/developer/apps" class="inline-link">Go to Apps</NuxtLink>
            </template>
          </p>
        </div>
      </div>
      <div v-else class="table-wrap" :class="{ 'is-loading': pending }">
        <table class="oauth-table">
          <thead>
            <tr>
              <th>App</th>
              <th>Client ID</th>
              <th>Redirect URIs</th>
              <th>Device flow</th>
              <th>Token expiry</th>
              <th class="col-date">Created</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in services" :key="service.appSid">
              <td>
                <div class="app-cell">
                  <span class="app-icon" :class="{ 'app-icon--fallback': !service.iconUrl || brokenIcons.has(service.appSid) }">
                    <img v-if="service.iconUrl && !brokenIcons.has(service.appSid)" :src="service.iconUrl" alt=""
                      width="28" height="28" loading="lazy" @error="markIconBroken(service.appSid)">
                    <Box v-else aria-hidden="true" />
                  </span>
                  <span class="cell-name">{{ service.name }}</span>
                  <span v-if="service.status === 'suspended'" class="suspended">Suspended</span>
                </div>
              </td>
              <td><code class="client-id">{{ service.clientId }}</code></td>
              <td>{{ service.redirectUris.length }}</td>
              <td>
                <span class="flag" :class="{ 'flag--on': service.deviceFlow }">
                  {{ service.deviceFlow ? 'Enabled' : 'Off' }}
                </span>
              </td>
              <td>
                <span class="flag" :class="{ 'flag--on': service.expireUserTokens }">
                  {{ service.expireUserTokens ? 'Expires' : 'Never' }}
                </span>
              </td>
              <td class="col-date">{{ formatDate(service.createdAt) }}</td>
              <td class="col-actions">
                <Button label="Edit" size="small" severity="secondary" text @click="openEdit(service)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="!availableApps.length && services.length" class="service-note">
        All Apps already have an OAuth service.
        <NuxtLink to="/developer/apps" class="inline-link">Create another App</NuxtLink> to register more.
      </p>
    </section>
  </div>

  <ConfirmDialog />

  <Dialog v-model:visible="dialogVisible" modal :draggable="false" :style="{ width: '38rem', maxWidth: '94vw' }"
    :header="dialogHeader">
    <div class="dialog-form">
      <label v-if="!editingAppSid" class="field" for="oauth-app">
        <span>App</span>
        <Select id="oauth-app" v-model="selectedAppSid" :options="availableApps" option-label="name"
          option-value="sid" filter :placeholder="availableApps.length ? 'Select an App' : 'No Apps available'" fluid />
        <span class="field-hint">Choose an existing App to attach this OAuth service to.</span>
      </label>
      <div v-else class="field">
        <span>App</span>
        <InputText :model-value="editingName" readonly fluid />
      </div>

      <div class="field">
        <span>Redirect URIs</span>
        <p class="field-hint">Where users return after authorization. Add up to {{ MAX_REDIRECT_URIS }}.</p>
        <div v-for="(_, index) in form.redirectUris" :key="index" class="redirect-row">
          <InputText v-model="form.redirectUris[index]" maxlength="512" autocomplete="off"
            placeholder="https://example.com/auth" fluid />
          <Button label="Delete" size="small" severity="danger" text
            :disabled="form.redirectUris.length <= 1" @click="removeRedirect(index)" />
        </div>
        <Button label="Add redirect URI" size="small" severity="secondary" outlined
          :disabled="form.redirectUris.length >= MAX_REDIRECT_URIS" @click="addRedirect" />
      </div>

      <div class="check-field">
        <Checkbox v-model="form.allowWildcard" binary input-id="oauth-wildcard" />
        <div>
          <label for="oauth-wildcard">Allow wildcard matching</label>
          <p class="field-hint">
            Permit * in redirect URIs for subdomains and paths. Only enable this if you control every match.
          </p>
        </div>
      </div>

      <div class="check-field">
        <Checkbox v-model="form.deviceFlow" binary input-id="oauth-device-flow" />
        <div>
          <label for="oauth-device-flow">Enable device flow</label>
          <p class="field-hint">Allow this service to authorize users on devices without a browser.</p>
        </div>
      </div>

      <div class="check-field">
        <Checkbox v-model="form.expireUserTokens" binary input-id="oauth-token-expiry" />
        <div>
          <label for="oauth-token-expiry">Expire user access tokens</label>
          <p class="field-hint">
            Access tokens expire after one hour and a refresh_token is issued for renewal.
          </p>
        </div>
      </div>

      <template v-if="editingAppSid">
        <div class="credentials">
          <h3 class="credentials-title">Credentials</h3>
          <label class="field" for="oauth-client-id">
            <span>Client ID</span>
            <InputText id="oauth-client-id" :model-value="editingAppSid" readonly fluid />
          </label>
          <label v-if="secretOnce" class="field" for="oauth-client-secret">
            <span>Client secret</span>
            <InputText id="oauth-client-secret" :model-value="secretOnce" readonly fluid />
          </label>
          <p v-if="secretOnce" class="field-hint secret-warning">
            Copy this secret now. It will not be shown again after you close this dialog.
          </p>
          <div v-else class="secret-reset">
            <Button label="Reset client secret" size="small" severity="secondary" outlined :disabled="saving"
              @click="askResetSecret" />
            <span class="field-hint">Resetting immediately invalidates the current secret.</span>
          </div>
        </div>
      </template>

      <p v-if="dialogError" class="dialog-error" role="alert">{{ dialogError }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="dialogVisible = false" />
      <Button :label="submitLabel" :loading="saving" :disabled="!valid || saving" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import Key from '@primeicons/vue/key'
import Plus from '@primeicons/vue/plus'

interface DeveloperApp {
  sid: string
  name: string
  iconUrl: string | null
}

interface OAuthService {
  appSid: string
  clientId: string
  name: string
  iconUrl: string | null
  redirectUris: string[]
  allowWildcard: boolean
  deviceFlow: boolean
  expireUserTokens: boolean
  status: string
  createdAt: string
}

interface OAuthServiceDetail extends OAuthService {
  clientSecret?: string
}

interface OAuthForm {
  redirectUris: string[]
  allowWildcard: boolean
  deviceFlow: boolean
  expireUserTokens: boolean
}

const MAX_REDIRECT_URIS = 10
const URL_RE = /^https?:\/\/[^\s]+$/i
const toast = useToast()
const confirm = useConfirm()

const { data, refresh, pending } = await useFetch<{ services: OAuthService[] }>('/api/developer/oauth')
const { data: appData, refresh: refreshApps } = await useFetch<{ apps: DeveloperApp[] }>('/api/developer/oauth/available-apps')
const services = computed(() => data.value?.services ?? [])
const availableApps = computed(() => appData.value?.apps ?? [])

const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editingAppSid = ref('')
const editingName = ref('')
const selectedAppSid = ref('')
const secretOnce = ref('')
const brokenIcons = reactive(new Set<string>())

function blankForm(): OAuthForm {
  return { redirectUris: [''], allowWildcard: false, deviceFlow: false, expireUserTokens: true }
}

const form = ref<OAuthForm>(blankForm())

const dialogHeader = computed(() => (editingAppSid.value ? 'Edit OAuth service' : 'Register OAuth service'))
const submitLabel = computed(() => (editingAppSid.value ? 'Save changes' : 'Register service'))

const valid = computed(() => {
  const redirects = form.value.redirectUris.map(uri => uri.trim()).filter(Boolean)
  const appOk = !!editingAppSid.value || !!selectedAppSid.value
  return appOk &&
    redirects.length >= 1 && redirects.length <= MAX_REDIRECT_URIS &&
    redirects.every(uri => uri.length <= 512 && URL_RE.test(uri) && !uri.includes('#') &&
      (form.value.allowWildcard || !uri.includes('*')))
})

function openCreate() {
  editingAppSid.value = ''
  editingName.value = ''
  selectedAppSid.value = ''
  secretOnce.value = ''
  form.value = blankForm()
  dialogError.value = ''
  dialogVisible.value = true
}

function applyDetail(service: OAuthServiceDetail, secret = '') {
  editingAppSid.value = service.appSid
  editingName.value = service.name
  selectedAppSid.value = service.appSid
  secretOnce.value = secret
  form.value = {
    redirectUris: service.redirectUris.length ? [...service.redirectUris] : [''],
    allowWildcard: service.allowWildcard,
    deviceFlow: service.deviceFlow,
    expireUserTokens: service.expireUserTokens
  }
  dialogError.value = ''
  dialogVisible.value = true
}

async function openEdit(service: OAuthService) {
  try {
    const res = await $fetch<{ service: OAuthServiceDetail }>(
      `/api/developer/oauth/${encodeURIComponent(service.appSid)}`
    )
    applyDetail(res.service)
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Could not load OAuth service',
      detail: (err as { statusMessage?: string }).statusMessage,
      life: 5000
    })
  }
}

function addRedirect() {
  if (form.value.redirectUris.length < MAX_REDIRECT_URIS) form.value.redirectUris.push('')
}

function removeRedirect(index: number) {
  if (form.value.redirectUris.length <= 1) return
  form.value.redirectUris.splice(index, 1)
}

function markIconBroken(appSid: string) {
  brokenIcons.add(appSid)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

async function submit() {
  if (!valid.value || saving.value) return
  saving.value = true
  dialogError.value = ''
  const editing = editingAppSid.value
  const redirectUris = form.value.redirectUris.map(uri => uri.trim()).filter(Boolean)
  try {
    const res = await $fetch<{ service: OAuthServiceDetail }>(
      editing
        ? `/api/developer/oauth/${encodeURIComponent(editing)}`
        : '/api/developer/oauth',
      {
        method: editing ? 'PATCH' : 'POST',
        body: {
          ...(editing ? {} : { appSid: selectedAppSid.value }),
          redirectUris,
          allowWildcard: form.value.allowWildcard,
          deviceFlow: form.value.deviceFlow,
          expireUserTokens: form.value.expireUserTokens
        }
      }
    )
    dialogVisible.value = false
    if (editing) {
      brokenIcons.delete(editing)
      toast.add({ severity: 'success', summary: 'OAuth service updated', life: 3000 })
    } else {
      toast.add({ severity: 'success', summary: 'OAuth service registered', detail: 'Client credentials are shown under Edit.', life: 4500 })
    }
    await Promise.all([refresh(), refreshApps()])
    if (!editing) applyDetail(res.service, res.service.clientSecret)
  } catch (err) {
    dialogError.value = (err as { statusMessage?: string }).statusMessage ??
      (editing ? 'Could not save changes.' : 'Could not register the service.')
  } finally {
    saving.value = false
  }
}

function askResetSecret() {
  if (!editingAppSid.value || saving.value) return
  confirm.require({
    header: 'Reset client secret',
    message: 'The current client secret will stop working immediately. Continue?',
    acceptLabel: 'Reset secret',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      saving.value = true
      try {
        const res = await $fetch<{ clientId: string, clientSecret: string }>(
          `/api/developer/oauth/${encodeURIComponent(editingAppSid.value)}/secret`,
          { method: 'POST' }
        )
        secretOnce.value = res.clientSecret
        toast.add({ severity: 'success', summary: 'Client secret reset', detail: 'Copy it now; it will not be shown again.', life: 6000 })
        await refresh()
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'Could not reset client secret',
          detail: (err as { statusMessage?: string }).statusMessage,
          life: 5000
        })
      } finally {
        saving.value = false
      }
    }
  })
}

useHead({ title: 'OAuth' })
</script>

<style scoped lang="scss">
.oauth-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;

  .section-title {
    margin: 0;
  }
}

.oauth-lead {
  margin: 0.4rem 0 0;
  max-width: 42rem;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.service-count {
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

.oauth-table {
  width: 100%;
  min-width: 760px;
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

.secret-reset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.secret-warning {
  color: var(--p-orange-500);
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

.client-id {
  font-family: var(--font-code);
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.flag {
  display: inline-block;
  padding: 0.08rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;

  &--on {
    border-color: color-mix(in srgb, var(--p-green-600, #16a34a) 35%, var(--border));
    color: var(--p-green-600, #16a34a);
  }
}

.col-date {
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.col-actions {
  text-align: right;
  white-space: nowrap;
}

.service-note {
  margin: 0.9rem 0 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.inline-link {
  color: var(--p-primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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

.field-hint {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.5;
}

.redirect-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  :deep(.p-inputtext) {
    flex: 1;
  }
}

.check-field {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;

  label {
    display: block;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
  }

  .field-hint {
    margin-top: 0.15rem;
  }
}

.credentials {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border);
}

.credentials-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
}

.dialog-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}

@media screen and (max-width: 600px) {
  .oauth-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
