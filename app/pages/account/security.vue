<template>
  <h2 class="section-title">Login Security</h2>

  <p v-if="githubMessage" class="github-msg"
    :class="githubMessageType === 'error' ? 'github-msg--error' : 'github-msg--ok'">
    {{ githubMessage }}
  </p>

  <section class="group">
    <h3 class="group-title">Credentials</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Password <ExclamationTriangle v-if="!hasPassword" class="row-warn"
              aria-label="Action required" /></span>
          <span class="row-desc">
            {{ hasPassword ? 'Change your sign-in password.' : 'No password set. Set one to sign in without an email code.' }}
          </span>
        </div>
        <div class="row-control">
          <Button :label="hasPassword ? 'Change password' : 'Set password'" severity="secondary" outlined size="small"
            @click="passwordOpen = true" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">GitHub</span>
          <span class="row-desc">Link a GitHub account for one-click sign-in.</span>
        </div>
        <div class="row-control value-action">
          <span v-if="githubLinked" class="github-account">
            <img v-if="githubAvatarUrl" class="github-avatar" :src="githubAvatarUrl" :alt="githubLogin || 'GitHub'"
              width="24" height="24" loading="lazy" />
            <span class="row-value">{{ githubLogin ? '@' + githubLogin : 'Linked' }}</span>
          </span>
          <Button v-if="!githubLinked" label="Link" severity="secondary" outlined size="small" @click="githubLink" />
          <Button v-else label="Unlink" severity="secondary" outlined size="small" :loading="githubUnlinking"
            @click="githubUnlink" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Passkeys</span>
          <span class="row-desc">Sign in without a password using passkeys.</span>
        </div>
        <div class="row-control value-action">
          <span class="row-value">{{ passkeys.length }}/{{ passkeyMax }}</span>
          <Button label="Manage" severity="secondary" outlined size="small" @click="passkeysOpen = true" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Authenticator App</span>
          <span class="row-desc">Use a time-based one-time code app for two-factor authentication.</span>
        </div>
        <div class="row-control value-action">
          <span v-if="totpEnabled" class="row-value">Set up</span>
          <Button :label="totpEnabled ? 'Manage' : 'Set up'" severity="secondary" outlined size="small"
            @click="totpOpen = true" />
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">Two-step authentication</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Two-step authentication <ExclamationTriangle v-if="!twoFactorEnabled" class="row-warn"
              aria-label="Action required" /></span>
          <span class="row-desc">
            {{ twoFactorEnabled ? 'A second verification step is required at sign-in.' : 'Require a second verification step at sign-in for stronger security.' }}
          </span>
        </div>
        <div class="row-control value-action">
          <span class="row-value">{{ twoFactorEnabled ? 'On' : 'Off' }}</span>
          <Button :label="twoFactorEnabled ? 'Manage' : 'Set up'" severity="secondary" outlined size="small"
            @click="twoFactorOpen = true" />
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">Devices</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Login devices</span>
          <span class="row-desc">View devices signed in to your account and sign out any of them.</span>
        </div>
        <div class="row-control value-action">
          <span class="row-value">{{ deviceCount }} device{{ deviceCount === 1 ? '' : 's' }}</span>
          <Button label="Manage" severity="secondary" outlined size="small" @click="devicesOpen = true" />
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">Session</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Sign out</span>
          <span class="row-desc">End this session on this device.</span>
        </div>
        <div class="row-control">
          <Button label="Sign out" severity="secondary" outlined size="small" :loading="signingOut" @click="signOut" />
        </div>
      </div>
    </div>
  </section>

  <!-- 设置 / 修改密码 -->
  <PasswordDialog v-model="passwordOpen" />

  <!-- AuthApp 绑定 / 解绑 -->
  <TotpDialog v-model="totpOpen" />

  <!-- 两步验证 -->
  <TwoFactorDialog v-model="twoFactorOpen" />

  <!-- 登录设备 -->
  <DevicesDialog v-model="devicesOpen" @changed="loadDeviceCount" />

  <!-- Passkey 管理 -->
  <Dialog v-model:visible="passkeysOpen" modal :draggable="false" header="Passkeys" :style="{ width: '32rem' }">
    <p v-if="!hasPassword" class="pk-empty">Set a password first to add or manage passkeys.</p>
    <p v-else-if="passkeys.length === 0" class="pk-empty">No passkeys yet.</p>
    <ul v-else class="pk-list">
      <li v-for="pk in passkeys" :key="pk.id" class="pk-item">
        <div class="pk-info">
          <span class="pk-name">{{ passkeyLabel(pk) }}</span>
          <span class="pk-date">Added {{ pk.createdAt || '—' }}</span>
        </div>
        <Button label="Delete" severity="danger" text size="small" @click="openDeletePasskey(pk)" />
      </li>
    </ul>
    <template #footer>
      <Button label="Close" severity="secondary" text @click="passkeysOpen = false" />
      <Button label="Add passkey" :disabled="!hasPassword || passkeys.length >= passkeyMax"
        @click="openAddPasskey" />
    </template>
  </Dialog>

  <!-- 添加 / 删除 Passkey（需当前密码校验） -->
  <Dialog v-model:visible="pkDialogOpen" modal :draggable="false"
    :header="pkMode === 'add' ? 'Add passkey' : 'Remove passkey'" :style="{ width: '26rem' }">
    <div class="dialog-form">
      <InputText v-model="pkPassword" type="password" :class="{ 'p-invalid': !!pkError }" autocomplete="current-password"
        placeholder="Current password" aria-label="Current password" @keyup.enter="pkSubmit" />
      <small class="dialog-hint">
        {{ pkMode === 'add' ? 'Confirm your password to add a passkey.' : 'Confirm your password to remove this passkey.' }}
      </small>
      <small v-if="pkError" class="dialog-error" role="alert">{{ pkError }}</small>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="pkDialogOpen = false" />
      <Button :label="pkMode === 'add' ? 'Continue' : 'Remove'" :loading="pkBusy" @click="pkSubmit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'

useHead({ title: 'Login Security' })

const { user: authUser, refresh } = useAuthUser()
const hasPassword = computed(() => authUser.value?.hasPassword ?? false)
const githubLinked = computed(() => authUser.value?.githubLinked ?? false)
const githubLogin = computed(() => authUser.value?.githubLogin ?? '')
const githubAvatarUrl = computed(() => authUser.value?.githubAvatarUrl ?? '')
const totpEnabled = computed(() => authUser.value?.totpEnabled ?? false)
const twoFactorEnabled = computed(() => authUser.value?.twoFactorEnabled ?? false)

// GitHub 绑定结果提示（由 OAuth 回调带 ?github_* 查询参数返回）
const route = useRoute()
const githubMessage = ref('')
const githubMessageType = ref<'ok' | 'error'>('ok')
onMounted(() => {
  const q = route.query
  if (q.github_linked) {
    githubMessage.value = 'GitHub account linked.'
  } else if (q.github_new) {
    githubMessage.value = 'GitHub account created. Please set a password.'
  } else if (q.github_error) {
    githubMessage.value = String(q.github_error)
    githubMessageType.value = 'error'
  } else {
    return
  }
  navigateTo({ path: route.path, query: {} }, { replace: true })
})

function githubLink() {
  window.location.href = '/api/auth/github/authorize?mode=link'
}

const githubUnlinking = ref(false)
async function githubUnlink() {
  if (githubUnlinking.value) return
  githubUnlinking.value = true
  try {
    await $fetch('/api/auth/github/unlink', { method: 'POST' })
    await refresh()
  } catch {
    // 忽略失败，状态以刷新结果为准
  } finally {
    githubUnlinking.value = false
  }
}

const signingOut = ref(false)
async function signOut() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // 请求失败也按已退出处理（Cookie 会在下次校验时失效）
  }
  authUser.value = null
  await navigateTo('/')
}

/* ---------------- 设置 / 修改密码 ---------------- */
const passwordOpen = ref(false)

/* ---------------- AuthApp / 两步验证弹窗 ---------------- */
const totpOpen = ref(false)
const twoFactorOpen = ref(false)

/* ---------------- 登录设备 ---------------- */
const devicesOpen = ref(false)
const deviceCount = ref(0)
async function loadDeviceCount() {
  try {
    const res = await $fetch<{ devices: unknown[] }>('/api/auth/devices')
    deviceCount.value = res.devices.length
  } catch {
    // 未登录或失败时忽略
  }
}
onMounted(loadDeviceCount)

/* ---------------- Passkeys ---------------- */
interface PasskeyItem {
  id: string
  name: string
  deviceType: string
  backedUp: boolean
  createdAt: string
}
const passkeys = ref<PasskeyItem[]>([])
const passkeyMax = ref(5)
const passkeysOpen = ref(false)

async function loadPasskeys() {
  try {
    const res = await $fetch<{ passkeys: PasskeyItem[]; max: number }>('/api/auth/passkey/list')
    passkeys.value = res.passkeys
    passkeyMax.value = res.max
  } catch {
    // 未登录或失败时忽略
  }
}
onMounted(loadPasskeys)

function passkeyLabel(pk: PasskeyItem) {
  if (pk.name) return pk.name
  if (pk.backedUp) return 'Synced passkey'
  return pk.deviceType === 'multiDevice' ? 'Multi-device passkey' : 'Single-device passkey'
}

const pkDialogOpen = ref(false)
const pkMode = ref<'add' | 'delete'>('add')
const pkTarget = ref('')
const pkPassword = ref('')
const pkError = ref('')
const pkBusy = ref(false)

function openAddPasskey() {
  if (!hasPassword.value) {
    githubMessage.value = 'Please set a password before adding a passkey.'
    githubMessageType.value = 'error'
    return
  }
  if (passkeys.value.length >= passkeyMax.value) {
    githubMessage.value = `You can bind up to ${passkeyMax.value} passkeys.`
    githubMessageType.value = 'error'
    return
  }
  pkMode.value = 'add'
  pkTarget.value = ''
  pkPassword.value = ''
  pkError.value = ''
  pkDialogOpen.value = true
}

function openDeletePasskey(pk: PasskeyItem) {
  if (!hasPassword.value) {
    githubMessage.value = 'Please set a password before managing passkeys.'
    githubMessageType.value = 'error'
    return
  }
  pkMode.value = 'delete'
  pkTarget.value = pk.id
  pkPassword.value = ''
  pkError.value = ''
  pkDialogOpen.value = true
}

async function pkSubmit() {
  if (pkBusy.value) return
  if (!pkPassword.value) {
    pkError.value = 'Please enter your current password.'
    return
  }
  pkBusy.value = true
  pkError.value = ''
  try {
    if (pkMode.value === 'delete') {
      await $fetch('/api/auth/passkey/delete', {
        method: 'POST',
        body: { password: pkPassword.value, id: pkTarget.value }
      })
    } else {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const options = await $fetch<Parameters<typeof startRegistration>[0]>('/api/auth/passkey/register/options', {
        method: 'POST',
        body: { password: pkPassword.value }
      })
      let response
      try {
        response = await startRegistration(options)
      } catch {
        pkError.value = 'Passkey creation was cancelled or is not supported on this device.'
        return
      }
      await $fetch('/api/auth/passkey/register/verify', { method: 'POST', body: { response } })
    }
    await loadPasskeys()
    await refresh()
    pkDialogOpen.value = false
  } catch (err) {
    const e = err as { statusCode?: number; data?: { data?: { code?: string } } }
    if (e?.data?.data?.code === 'NO_PASSWORD') pkError.value = 'Please set a password before adding a passkey.'
    else if (e?.statusCode === 403) pkError.value = 'Incorrect password.'
    else if (e?.statusCode === 409) pkError.value = `You can bind up to ${passkeyMax.value} passkeys.`
    else if (e?.statusCode === 410) pkError.value = 'This session has expired. Please try again.'
    else pkError.value = 'Something went wrong. Please try again.'
  } finally {
    pkBusy.value = false
  }
}
</script>

<style scoped lang="scss">
.row-warn {
  width: 0.9em;
  height: 0.9em;
  margin-left: 0.35rem;
  color: var(--p-orange-500);
  vertical-align: -0.12em;
}

.value-action {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.github-account {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.github-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--p-content-border-color);
  object-fit: cover;
}

.github-msg {
  margin: -1rem 0 1.5rem;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.88rem;

  &--ok {
    background: color-mix(in srgb, var(--p-green-500) 12%, transparent);
    color: var(--p-green-600);
  }

  &--error {
    background: color-mix(in srgb, var(--p-red-500) 12%, transparent);
    color: var(--p-red-600);
  }
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

.dialog-hint {
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
}

.dialog-error {
  color: var(--p-red-500);
  font-size: 0.85rem;
}

/* Passkey 管理弹窗 */
.pk-empty {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.pk-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
}

.pk-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pk-name {
  font-size: 0.92rem;
  font-weight: 500;
}

.pk-date {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
</style>
