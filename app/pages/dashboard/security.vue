<template>
  <div class="dash-grid">
    <section class="dash-card dash-card--wide">
      <div class="dash-card-head">
        <h2 class="dash-card-title">{{ t('sec.title') }}</h2>
        <Tag v-if="verified" :value="t('sec.verified')" severity="secondary" rounded />
        <Tag v-else :value="t('sec.needsVerify')" severity="warn" rounded />
      </div>

      <div class="sec-rows">
        <!-- 动态邮箱码：始终可用，不需要绑定 -->
        <div class="dash-row">
          <div class="dash-row-main">
            <span class="dash-row-label">{{ t('method.email.label') }}</span>
            <span class="dash-row-desc">{{ t('sec.email.desc', { email: data?.email ?? '' }) }}</span>
          </div>
          <Tag :value="data?.methods.email ? t('sec.alwaysOn') : t('sec.turnedOff')"
            :severity="data?.methods.email ? 'secondary' : 'warn'" rounded />
        </div>

        <!-- AuthApp -->
        <div class="dash-row">
          <div class="dash-row-main">
            <span class="dash-row-label">{{ t('method.app.label') }}</span>
            <span class="dash-row-desc">
              {{ app.bound ? t('sec.app.bound', { issuer: data?.app.issuer ?? '' }) : t('sec.app.unbound') }}
            </span>
          </div>
          <div class="sec-actions">
            <Tag :value="app.bound ? t('sec.bound') : t('sec.unbound')"
              :severity="app.bound ? 'secondary' : 'warn'" rounded />
            <Button v-if="app.bound" :label="t('sec.remove')" severity="danger" text size="small" :disabled="busy"
              @click="askRemoveApp" />
            <Button v-else :label="t('sec.enable')" size="small" :disabled="busy" @click="startAppSetup" />
          </div>
        </div>

        <!-- Passkey -->
        <div class="dash-row">
          <div class="dash-row-main">
            <span class="dash-row-label">{{ t('method.passkey.label') }}</span>
            <span class="dash-row-desc">{{ t('sec.passkey.desc', { max: data?.maxPasskeys ?? 5 }) }}</span>
          </div>
          <div class="sec-actions">
            <Tag :value="passkeys.length ? t('sec.bound') : t('sec.unbound')"
              :severity="passkeys.length ? 'secondary' : 'warn'" rounded />
            <Button :label="t('sec.passkey.add')" size="small"
              :disabled="busy || passkeys.length >= (data?.maxPasskeys ?? 5)" @click="addPasskey" />
          </div>
        </div>
      </div>

      <!-- 已绑定的 Passkey 列表 -->
      <div v-if="passkeys.length" class="pk-list">
        <div v-for="passkey in passkeys" :key="passkey.id" class="pk-item">
          <div class="dash-row-main">
            <span class="dash-row-label">{{ passkey.name || t('sec.passkey.unnamed') }}</span>
            <span class="dash-row-desc">
              {{ t('sec.passkey.boundAt', { date: formatDate(passkey.createdAt) })
              }}<template v-if="passkey.backedUp">{{ t('sec.passkey.synced') }}</template>
            </span>
          </div>
          <Button :label="t('sec.remove')" severity="danger" text size="small" :disabled="busy"
            @click="askRemovePasskey(passkey)" />
        </div>
      </div>

      <p v-if="offMethods.length" class="dash-card-note">
        {{ t('sec.offNote', { methods: offMethods.join(' / ') }) }}
      </p>

      <p class="dash-card-note">{{ t('sec.note') }}</p>
    </section>
  </div>

  <!-- 身份确认弹窗：每行 8 格 -->
  <Dialog v-model:visible="confirmDialog" modal :draggable="false" :header="t('sec.confirm.header')"
    :style="{ width: '30rem' }" @hide="resetConfirm">
    <div class="dialog-form">
      <p class="dash-card-note">{{ t('sec.confirm.desc', { email: data?.email ?? '' }) }}</p>
      <div class="confirm-code">
        <ConsoleOtpInput v-model="confirmCode" :length="64" :columns="8" id-prefix="confirm-code"
          :label-template="t('aria.confirmChar')" :aria-label="t('sec.confirm.header')" />
      </div>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="confirmDialog = false" />
      <Button :label="resendIn > 0 ? t('common.sendIn', { seconds: resendIn }) : t('common.sendCode')"
        severity="secondary" outlined :disabled="resendIn > 0 || sending" :loading="sending"
        @click="sendConfirmCode" />
      <Button :label="t('common.confirm')" :loading="confirming" :disabled="confirmCode.length !== 64"
        @click="confirmIdentity" />
    </template>
  </Dialog>

  <!-- AuthApp 绑定弹窗：二维码 + 明文密钥 + 6 位动态码校验 -->
  <Dialog v-model:visible="appDialog" modal :draggable="false" :header="t('sec.pair.header')"
    :style="{ width: '30rem' }" @hide="resetAppDialog">
    <div class="dialog-form">
      <p class="dash-card-note">{{ t('sec.pair.desc') }}</p>
      <img v-if="appQr" class="app-qr" :src="appQr" alt="Authenticator QR code">
      <label class="sec-field" for="app-secret">
        <span>{{ t('sec.pair.key') }}</span>
        <InputText id="app-secret" :model-value="appSecret" name="setup-key" readonly autocomplete="off" fluid />
      </label>
      <div class="confirm-code">
        <ConsoleOtpInput v-model="appCode" :length="6" integer-only id-prefix="pair-code"
          :label-template="t('aria.appDigit')" :aria-label="t('method.app.label')" />
      </div>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text @click="appDialog = false" />
      <Button :label="t('sec.pair.verify')" :loading="pairing" :disabled="appCode.length !== 6" @click="activateApp" />
    </template>
  </Dialog>

  <ConfirmDialog />
</template>

<script setup lang="ts">
import type { AdminAuthMethods } from '~/composables/useAdminAuth'

// 每个管理员自己的「安全登录」区：绑定/解绑 AuthApp 与 Passkey
// 绑定与解绑都属于敏感操作：先弹窗验证一次邮箱码（10 分钟授权），再执行；
// 操作结果与失败一律用 Toast 提示（控制台统一约定）
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

interface SecurityPasskey {
  id: string
  name: string
  deviceType: string
  backedUp: boolean
  createdAt: string
}

interface SecurityData {
  methods: AdminAuthMethods
  email: string
  verified: boolean
  app: { bound: boolean, issuer: string, account: string }
  passkeys: SecurityPasskey[]
  maxPasskeys: number
}

const { data, refresh } = await useFetch<SecurityData>('/api/dashboard/security')
const confirm = useConfirm()
const toast = useToast()
const { t, locale, restoreLocale } = useConsoleI18n()

onMounted(restoreLocale)

const verified = computed(() => data.value?.verified ?? false)
const passkeys = computed(() => data.value?.passkeys ?? [])
const app = computed(() => data.value?.app ?? { bound: false, issuer: 'BITS', account: '' })
const offMethods = computed(() =>
  ADMIN_AUTH_METHODS.filter(method => !data.value?.methods[method.key]).map(method => t(method.labelKey)))

const busy = ref(false)

function notify(severity: 'success' | 'error' | 'info', summary: string, detail?: string) {
  toast.add({ severity, summary, detail, life: severity === 'error' ? 6000 : 3500 })
}

function errorDetail(err: unknown, fallback: string) {
  const e = err as { statusCode?: number, statusMessage?: string, data?: { data?: { code?: string, retryAfterSeconds?: number } } }
  if (e.data?.data?.code === 'NEEDS_VERIFY' || e.statusCode === 403) return t('common.needVerify')
  if (e.statusCode === 410) return t('common.stepExpired')
  const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
  if (e.statusCode === 429) {
    return retry >= 60 ? t('common.tooManyInMin', { minutes: Math.ceil(retry / 60) }) : t('common.tooMany')
  }
  return t(fallback)
}

// 身份确认弹窗
const confirmDialog = ref(false)
const sending = ref(false)
const confirming = ref(false)
const confirmCode = ref('')
const resendIn = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null
let pending: (() => void) | null = null

onBeforeUnmount(() => { if (resendTimer) clearInterval(resendTimer) })

function formatDate(value: string) {
  return value
    ? new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
}

function startCountdown(seconds: number) {
  if (resendTimer) clearInterval(resendTimer)
  resendIn.value = Math.max(0, Math.ceil(seconds))
  resendTimer = setInterval(() => {
    resendIn.value = Math.max(0, resendIn.value - 1)
    if (resendIn.value === 0 && resendTimer) clearInterval(resendTimer)
  }, 1000)
}

// 需要身份确认的动作：未确认则开弹窗（并发码），确认后自动继续
function withIdentity(action: () => void) {
  if (verified.value) {
    action()
    return
  }
  pending = action
  resetConfirm()
  confirmDialog.value = true
  sendConfirmCode()
}

function resetConfirm() {
  confirmCode.value = ''
  if (resendTimer && resendIn.value === 0) clearInterval(resendTimer)
}

async function sendConfirmCode() {
  if (sending.value || resendIn.value > 0) return
  sending.value = true
  try {
    const res = await $fetch<{ resendAfterSeconds: number }>('/api/dashboard/security/confirm/send', { method: 'POST' })
    startCountdown(res.resendAfterSeconds)
    await nextTick()
    document.querySelector<HTMLInputElement>('.confirm-code input')?.focus()
  } catch (err) {
    const e = err as { data?: { data?: { retryAfterSeconds?: number } } }
    const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
    if (retry > 0) startCountdown(retry)
    notify('error', t('toast.couldNotSend'), errorDetail(err, 'common.tryLater'))
  } finally {
    sending.value = false
  }
}

async function confirmIdentity() {
  if (confirming.value || confirmCode.value.length !== 64) return
  confirming.value = true
  try {
    await $fetch('/api/dashboard/security/confirm/verify', { method: 'POST', body: { code: confirmCode.value } })
    confirmCode.value = ''
    confirmDialog.value = false
    await refresh()
    const next = pending
    pending = null
    next?.()
  } catch (err) {
    notify('error', t('toast.identityFailed'), errorDetail(err, 'common.tryAgain'))
  } finally {
    confirming.value = false
  }
}

// ---------- AuthApp ----------
const appDialog = ref(false)
const appQr = ref('')
const appSecret = ref('')
const appCode = ref('')
const pairing = ref(false)

function startAppSetup() {
  withIdentity(async () => {
    appCode.value = ''
    try {
      const res = await $fetch<{ secret: string, qrDataUrl: string }>('/api/dashboard/security/totp/setup', {
        method: 'POST'
      })
      appQr.value = res.qrDataUrl
      appSecret.value = res.secret
      appDialog.value = true
    } catch (err) {
      notify('error', t('toast.pairFailed'), errorDetail(err, 'common.tryAgain'))
    }
  })
}

function resetAppDialog() {
  appQr.value = ''
  appSecret.value = ''
  appCode.value = ''
}

async function activateApp() {
  if (pairing.value || appCode.value.length !== 6) return
  pairing.value = true
  try {
    await $fetch('/api/dashboard/security/totp/activate', { method: 'POST', body: { code: appCode.value } })
    appDialog.value = false
    resetAppDialog()
    await refresh()
    notify('success', t('toast.paired'), t('toast.pairedDetail'))
  } catch (err) {
    notify('error', t('toast.pairFailed'), errorDetail(err, 'toast.incorrectCode'))
  } finally {
    pairing.value = false
  }
}

function askRemoveApp() {
  if (busy.value) return
  confirm.require({
    header: t('sec.removeApp.header'),
    message: t('sec.removeApp.message'),
    acceptLabel: t('sec.remove'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () => withIdentity(doRemoveApp)
  })
}

async function doRemoveApp() {
  busy.value = true
  try {
    await $fetch('/api/dashboard/security/totp/disable', { method: 'POST' })
    await refresh()
    notify('success', t('toast.appRemoved'))
  } catch (err) {
    notify('error', t('toast.appRemoveFailed'), errorDetail(err, 'common.tryAgain'))
  } finally {
    busy.value = false
  }
}

// ---------- Passkey ----------
function addPasskey() {
  withIdentity(async () => {
    busy.value = true
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const options = await $fetch<Parameters<typeof startRegistration>[0]['optionsJSON']>(
        '/api/dashboard/security/passkey/options', { method: 'POST' }
      )
      let response
      try {
        response = await startRegistration({ optionsJSON: options })
      } catch {
        notify('info', t('toast.passkeyCancelled'), t('toast.passkeyCancelledDetail'))
        return
      }
      await $fetch('/api/dashboard/security/passkey/verify', { method: 'POST', body: { response } })
      await refresh()
      notify('success', t('toast.passkeyAdded'), t('toast.passkeyAddedDetail'))
    } catch (err) {
      notify('error', t('toast.passkeyFailed'), errorDetail(err, 'common.tryAgain'))
    } finally {
      busy.value = false
    }
  })
}

function askRemovePasskey(passkey: SecurityPasskey) {
  if (busy.value) return
  confirm.require({
    header: t('sec.removePasskey.header'),
    message: t('sec.removePasskey.message', { name: passkey.name || t('sec.passkey.unnamed') }),
    acceptLabel: t('sec.remove'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () => withIdentity(() => doRemovePasskey(passkey))
  })
}

async function doRemovePasskey(passkey: SecurityPasskey) {
  busy.value = true
  try {
    await $fetch('/api/dashboard/security/passkey/delete', { method: 'POST', body: { id: passkey.id } })
    await refresh()
    notify('success', t('toast.passkeyRemoved'))
  } catch (err) {
    notify('error', t('toast.passkeyRemoveFailed'), errorDetail(err, 'common.tryAgain'))
  } finally {
    busy.value = false
  }
}

useHead({
  title: () => t('title.security'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
.sec-rows {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.sec-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pk-list {
  display: flex;
  flex-direction: column;
  padding-top: 0.4rem;
  border-top: 1px solid var(--dash-border);
}

.pk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.6rem 0 0.6rem 1rem;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.sec-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.app-qr {
  align-self: center;
  width: 11rem;
  height: 11rem;
  border-radius: 12px;
  background: #fff;
}
</style>
