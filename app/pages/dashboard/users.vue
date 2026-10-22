<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h2 class="page-title">{{ t('users.title') }}</h2>
        <p class="page-sub">
          {{ total === 1 ? t('users.subtitle', { count: total }) : t('users.subtitlePlural', { count: total }) }}
        </p>
        <p v-if="truncated" class="page-note">{{ t('users.truncated', { limit: LIST_LIMIT }) }}</p>
      </div>
    </header>

    <ConsoleDataTable :value="rows" :columns="columns" data-key="uuid" :loading="pending" :rows="25"
      :selectable="false" :search-fields="['account', 'email', 'security']" @refresh="refresh">
      <template #cell-account="{ row }">
        <div class="cell-main">
          <UserAvatar :src="row.avatarUrl" :size="28" />
          <span class="cell-text">
            <span class="cell-title">{{ row.nickname }}</span>
            <span class="cell-sub">{{ usernameLabel(row) }}</span>
          </span>
        </div>
      </template>

      <template #cell-status="{ row }">
        <StatusTag :label="t(`users.status.${row.status}`)" :status="row.status"
          :severity="row.status === 'normal' ? 'secondary' : 'danger'"
          :title="row.status === 'disabled' ? disabledHint(row) : undefined" />
      </template>

      <template #cell-actions="{ row }">
        <div class="cell-actions">
          <Button :label="t('users.view')" severity="secondary" text size="small" @click="openDetail(row)" />
          <Button v-if="row.status === 'normal'" :label="t('users.disable')" severity="danger" text size="small"
            @click="openDisable(row)" />
          <Button v-else :label="t('users.enable')" severity="secondary" text size="small" @click="enableUser(row)" />
        </div>
      </template>
    </ConsoleDataTable>
  </div>

  <!-- 账户详情：一次拉全（列表里不带设备等敏感信息） -->
  <Dialog v-model:visible="detailVisible" modal :draggable="false" :style="{ width: '42rem' }"
    :header="t('users.detail.title')">
    <div v-if="detailLoading" class="detail-loading">{{ t('users.loading') }}</div>

    <div v-else-if="detail" class="detail">
      <div class="detail-head">
        <div class="detail-person">
          <UserAvatar :src="detail.avatarUrl" :size="40" />
          <div>
            <span class="detail-name">{{ detail.nickname }}</span>
            <span class="detail-sub">{{ usernameLabel(detail) }}</span>
          </div>
        </div>
        <StatusTag :label="t(`users.status.${detail.status}`)" :status="detail.status"
          :severity="detail.status === 'normal' ? 'secondary' : 'danger'" />
      </div>

      <p v-if="detail.status === 'disabled'" class="banner">
        {{ t('users.detail.disabledBanner', {
          date: formatDate(detail.disabled_at),
          reason: detail.disabled_reason || t('users.detail.noReason')
        }) }}
      </p>

      <section class="detail-block">
        <h3 class="detail-title">{{ t('users.detail.account') }}</h3>
        <div class="kv"><span class="k">{{ t('users.detail.email') }}</span><span class="v">{{ detail.email }}</span></div>
        <div class="kv">
          <span class="k">{{ t('users.detail.accountId') }}</span>
          <span class="v mono">
            {{ detail.uuid }}
            <button type="button" class="copy" @click="copyUuid">{{ t('users.copy') }}</button>
          </span>
        </div>
        <div class="kv"><span class="k">{{ t('users.detail.registered') }}</span><span class="v">{{ formatDate(detail.created_at) }}</span></div>
        <div class="kv"><span class="k">{{ t('users.detail.lastLogin') }}</span><span class="v">{{ formatDate(detail.last_login_at) }}</span></div>
        <div v-if="detail.bio" class="kv"><span class="k">{{ t('users.detail.bio') }}</span><span class="v">{{ detail.bio }}</span></div>
      </section>

      <section class="detail-block">
        <h3 class="detail-title">{{ t('users.detail.security') }}</h3>
        <div class="kv">
          <span class="k">{{ t('users.detail.password') }}</span>
          <span class="v status-line">
            <StatusIcon :status="detail.hasPassword ? 'set' : 'unset'" />
            {{ detail.hasPassword ? t('users.detail.set') : t('users.detail.unset') }}
          </span>
        </div>
        <div class="kv">
          <span class="k">AuthApp</span>
          <span class="v status-line">
            <StatusIcon :status="detail.appBound ? 'bound' : 'unbound'" />
            {{ detail.appBound ? t('users.detail.bound') : t('users.detail.unbound') }}
          </span>
        </div>
        <div class="kv">
          <span class="k">{{ t('users.detail.passkeys') }}</span>
          <span class="v status-line"><StatusIcon status="key" /> {{ detail.passkeyCount }}</span>
        </div>
        <div class="kv">
          <span class="k">GitHub</span>
          <span class="v status-line">
            <StatusIcon :status="detail.githubLogin ? 'bound' : 'unbound'" />
            {{ detail.githubLogin || t('users.detail.unbound') }}
          </span>
        </div>
        <div class="kv">
          <span class="k">{{ t('users.detail.twoFactor') }}</span>
          <span class="v status-line">
            <StatusIcon :status="detail.twoFactorEnabled ? 'on' : 'off'" />
            {{ detail.twoFactorEnabled ? t('users.detail.on') : t('users.detail.off') }}
          </span>
        </div>
      </section>

      <section class="detail-block">
        <h3 class="detail-title">{{ t('users.detail.devices') }}</h3>
        <p v-if="!detail.devices.length" class="muted">{{ t('users.detail.devicesEmpty') }}</p>
        <ul v-else class="device-list">
          <li v-for="device in detail.devices" :key="device.id" class="device">
            <div class="device-main">
              <span class="device-name">{{ device.name }}</span>
              <span class="cell-sub">{{ formatDate(device.loginAt) }}</span>
            </div>
            <Button :label="t('users.detail.revoke')" severity="secondary" text size="small"
              @click="revokeDevice(device)" />
          </li>
        </ul>
        <Button v-if="detail.devices.length" :label="t('users.detail.revokeAll')" severity="danger" text size="small"
          @click="revokeAllDevices" />
      </section>

      <section class="detail-block">
        <h3 class="detail-title">{{ t('users.detail.actions') }}</h3>
        <div class="action-row">
          <Button :label="t('users.detail.resetApp')" severity="secondary" outlined size="small"
            :disabled="!detail.appBound" @click="resetApp" />
          <Button :label="t('users.detail.resetPasskeys')" severity="secondary" outlined size="small"
            :disabled="!detail.passkeyCount" @click="resetPasskeys" />
          <Button :label="t('users.detail.unlinkGithub')" severity="secondary" outlined size="small"
            :disabled="!detail.githubLogin" @click="unlinkGithub" />
        </div>
      </section>
    </div>
  </Dialog>

  <!-- 禁用：记一条内部原因 -->
  <Dialog v-model:visible="disableVisible" modal :draggable="false" :style="{ width: '30rem' }"
    :header="t('users.disable.title', { name: disableTarget?.nickname ?? '' })">
    <div class="form">
      <p class="note">{{ t('users.disable.note') }}</p>
      <label class="field" for="disable-reason">
        <span>{{ t('users.disable.reason') }}</span>
        <InputText id="disable-reason" v-model="disableReason" name="reason" maxlength="255" autocomplete="off"
          fluid />
      </label>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="disableVisible = false" />
      <Button :label="t('users.disable')" severity="danger" :loading="saving" @click="disableUser" />
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import type { ConsoleColumn } from '~/components/ConsoleDataTable.vue'

// 站点用户管理：查找 + 查看真实状态 + 处置（禁用 / 下线 / 重置第二因子 / 解绑 GitHub）
// 不代用户改资料、不冒充登录；禁用后所有登录入口即时生效（status 检查在服务端）
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface UserRow {
  uuid: string
  email: string
  username: string
  nickname: string
  status: 'normal' | 'disabled'
  created_at: string
  last_login_at: string | null
  disabled_at: string | null
  disabled_reason: string
  hasPassword: boolean
  appBound: boolean
  twoFactorEnabled: boolean
  passkeyCount: number
  avatarUrl: string | null
  githubLogin: string | null
}

interface DeviceRow {
  id: string
  name: string
  type: string
  loginAt: string
}

interface UserDetail extends UserRow {
  bio: string
  email_verified_at: string | null
  recoveryCodeCount: number
  devices: DeviceRow[]
}

type TableRow = UserRow & { account: string, security: string }

const LIST_LIMIT = 500

const { t, locale, restoreLocale } = useConsoleI18n()
const toast = useToast()
const confirm = useConfirm()

onMounted(restoreLocale)

const { data, pending, refresh } = await useFetch<{ users: UserRow[], total: number, truncated: boolean }>('/api/dashboard/users')
const users = computed(() => data.value?.users ?? [])
const total = computed(() => data.value?.total ?? 0)
const truncated = computed(() => data.value?.truncated ?? false)

function usernameLabel(row: { username: string, email: string }) {
  return row.username && row.username !== row.email ? `@${row.username}` : t('users.usernameUnset')
}

function securityText(row: UserRow) {
  const parts: string[] = []
  if (row.hasPassword) parts.push(t('users.security.password'))
  if (row.appBound) parts.push(t('users.security.app'))
  if (row.passkeyCount === 1) parts.push(t('users.security.passkey', { count: 1 }))
  else if (row.passkeyCount > 1) parts.push(t('users.security.passkeys', { count: row.passkeyCount }))
  if (row.githubLogin) parts.push('GitHub')
  return parts.join(' · ') || t('users.security.none')
}

function disabledHint(row: UserRow) {
  return [formatDate(row.disabled_at), row.disabled_reason].filter(Boolean).join(' · ')
}

const rows = computed<TableRow[]>(() => users.value.map(user => ({
  ...user,
  account: `${user.nickname} ${usernameLabel(user)}`,
  security: securityText(user)
})))

const columns = computed<ConsoleColumn[]>(() => [
  { field: 'account', header: t('users.col.account'), width: '13rem' },
  { field: 'email', header: t('users.col.email'), width: '15rem' },
  {
    field: 'status',
    header: t('users.col.status'),
    type: 'enum',
    groupable: true,
    width: '6.5rem',
    options: [
      { label: t('users.status.normal'), value: 'normal' },
      { label: t('users.status.disabled'), value: 'disabled' }
    ]
  },
  { field: 'security', header: t('users.col.security'), sortable: false, width: '17rem' },
  { field: 'created_at', header: t('users.col.createdAt'), type: 'date', width: '11rem', defaultHidden: true },
  { field: 'last_login_at', header: t('users.col.lastLogin'), type: 'date', width: '11rem', defaultHidden: true },
  {
    field: 'actions',
    header: t('users.col.actions'),
    type: 'actions',
    sortable: false,
    width: '9rem',
    frozen: true,
    frozenAlign: 'right'
  }
])

const saving = ref(false)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<UserDetail | null>(null)
const activeUser = ref<UserRow | null>(null)

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
}

function notify(severity: 'success' | 'error', summary: string, detailMsg?: string) {
  toast.add({ severity, summary, detail: detailMsg, life: severity === 'error' ? 6000 : 3000 })
}

function apiError(err: unknown) {
  const e = err as { statusMessage?: string }
  return e.statusMessage ?? t('common.tryAgain')
}

function askConfirm(options: {
  header: string
  message: string
  acceptLabel: string
  severity?: 'danger' | 'secondary'
  action: () => Promise<void>
}) {
  confirm.require({
    header: options.header,
    message: options.message,
    acceptLabel: options.acceptLabel,
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: options.severity ?? 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () => {
      void options.action().catch(err => notify('error', t('users.toast.failed'), apiError(err)))
    }
  })
}

async function openDetail(row: UserRow) {
  activeUser.value = row
  detail.value = null
  detailLoading.value = true
  detailVisible.value = true
  try {
    detail.value = (await $fetch<{ user: UserDetail }>(`/api/dashboard/users/${row.uuid}`)).user
  } catch (err) {
    detailVisible.value = false
    notify('error', t('users.toast.failed'), apiError(err))
  } finally {
    detailLoading.value = false
  }
}

async function reloadDetail() {
  if (!activeUser.value) return
  detail.value = (await $fetch<{ user: UserDetail }>(`/api/dashboard/users/${activeUser.value.uuid}`)).user
}

async function copyUuid() {
  if (!detail.value) return
  try {
    await navigator.clipboard.writeText(detail.value.uuid)
    notify('success', t('users.copied'))
  } catch {
    // 剪贴板不可用时保持静默，用户可手动选中
  }
}

// ---------- 启用 / 禁用 ----------
const disableVisible = ref(false)
const disableReason = ref('')
const disableTarget = ref<UserRow | null>(null)

function openDisable(row: UserRow) {
  disableTarget.value = row
  disableReason.value = ''
  disableVisible.value = true
}

async function disableUser() {
  if (saving.value || !disableTarget.value) return
  saving.value = true
  try {
    await $fetch(`/api/dashboard/users/${disableTarget.value.uuid}`, {
      method: 'PATCH',
      body: { status: 'disabled', reason: disableReason.value }
    })
    disableVisible.value = false
    await refresh()
    if (activeUser.value?.uuid === disableTarget.value.uuid) await reloadDetail()
    notify('success', t('users.toast.disabled'))
  } catch (err) {
    notify('error', t('users.toast.failed'), apiError(err))
  } finally {
    saving.value = false
  }
}

function enableUser(row: UserRow) {
  askConfirm({
    header: t('users.enableConfirm.header'),
    message: t('users.enableConfirm.message', { name: row.nickname }),
    acceptLabel: t('users.enable'),
    severity: 'secondary',
    action: async () => {
      await $fetch(`/api/dashboard/users/${row.uuid}`, { method: 'PATCH', body: { status: 'normal' } })
      await refresh()
      if (activeUser.value?.uuid === row.uuid) await reloadDetail()
      notify('success', t('users.toast.enabled'))
    }
  })
}

// ---------- 登录设备 ----------
function revokeDevice(device: DeviceRow) {
  if (!activeUser.value) return
  const uuid = activeUser.value.uuid
  askConfirm({
    header: t('users.revokeConfirm.header'),
    message: t('users.revokeConfirm.message', { name: device.name }),
    acceptLabel: t('users.detail.revoke'),
    action: async () => {
      await $fetch(`/api/dashboard/users/${uuid}/sessions/revoke`, { method: 'POST', body: { id: device.id } })
      await reloadDetail()
      notify('success', t('users.toast.deviceRevoked'))
    }
  })
}

function revokeAllDevices() {
  if (!activeUser.value) return
  const uuid = activeUser.value.uuid
  askConfirm({
    header: t('users.revokeAllConfirm.header'),
    message: t('users.revokeAllConfirm.message', { name: activeUser.value.nickname }),
    acceptLabel: t('users.detail.revokeAll'),
    action: async () => {
      await $fetch(`/api/dashboard/users/${uuid}/sessions/revoke`, { method: 'POST', body: {} })
      await reloadDetail()
      notify('success', t('users.toast.devicesRevoked'))
    }
  })
}

// ---------- 安全绑定 ----------
function resetApp() {
  if (!activeUser.value) return
  const uuid = activeUser.value.uuid
  askConfirm({
    header: t('users.resetAppConfirm.header'),
    message: t('users.resetAppConfirm.message', { name: activeUser.value.nickname }),
    acceptLabel: t('users.detail.resetApp'),
    action: async () => {
      await $fetch(`/api/dashboard/users/${uuid}/security/reset`, { method: 'POST', body: { scope: 'app' } })
      await refresh()
      await reloadDetail()
      notify('success', t('users.toast.appReset'))
    }
  })
}

function resetPasskeys() {
  if (!activeUser.value) return
  const uuid = activeUser.value.uuid
  askConfirm({
    header: t('users.resetPasskeysConfirm.header'),
    message: t('users.resetPasskeysConfirm.message', { name: activeUser.value.nickname }),
    acceptLabel: t('users.detail.resetPasskeys'),
    action: async () => {
      await $fetch(`/api/dashboard/users/${uuid}/security/reset`, { method: 'POST', body: { scope: 'passkeys' } })
      await refresh()
      await reloadDetail()
      notify('success', t('users.toast.passkeysRemoved'))
    }
  })
}

function unlinkGithub() {
  if (!activeUser.value) return
  const uuid = activeUser.value.uuid
  askConfirm({
    header: t('users.unlinkGithubConfirm.header'),
    message: t('users.unlinkGithubConfirm.message', { name: activeUser.value.nickname }),
    acceptLabel: t('users.detail.unlinkGithub'),
    action: async () => {
      await $fetch(`/api/dashboard/users/${uuid}/github/unlink`, { method: 'POST' })
      await refresh()
      await reloadDetail()
      notify('success', t('users.toast.githubUnlinked'))
    }
  })
}

useHead({
  title: () => t('title.users'),
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

.page-note {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.cell-main {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.cell-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
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

.cell-actions {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.detail-loading {
  padding: 1rem 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.detail-person {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.detail-name {
  display: block;
  font-size: 1rem;
  font-weight: 600;
}

.detail-sub {
  display: block;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.banner {
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--p-red-500, #ef4444) 35%, transparent);
  background: color-mix(in srgb, var(--p-red-500, #ef4444) 8%, transparent);
  font-size: 0.8rem;
  line-height: 1.5;
}

.detail-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--dash-border);
}

.detail-title {
  margin: 0 0 0.15rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.kv {
  display: grid;
  grid-template-columns: 8.5rem 1fr;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.k {
  color: var(--p-text-muted-color);
}

.v {
  min-width: 0;
  word-break: break-word;
}

.status-line {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.mono {
  font-family: var(--font-code);
  font-size: 0.78rem;
}

.copy {
  margin-left: 0.4rem;
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-decoration: underline;
  cursor: pointer;
}

.muted {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-text-muted-color);
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.device {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0;
}

.device-main {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.device-name {
  font-size: 0.85rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.note {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
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
