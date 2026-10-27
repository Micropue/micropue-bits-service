<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :closable="!verifying" :close-on-escape="!verifying"
    :header="t('advanced.title')" :style="{ width: '34rem' }" @hide="onHide">
    <div class="advanced-form">
      <p class="advanced-method-line">
        {{ t('advanced.methodUsing', { method: methodLabel }) }}
        <NuxtLink to="/dashboard/security" class="advanced-method-link" @click="settleAdvanced(false)">
          {{ t('advanced.changeMethod') }}
        </NuxtLink>
      </p>

      <p class="advanced-desc">
        {{ method === 'email'
          ? t('advanced.desc', { email: user?.email ?? '' })
          : method === 'app' ? t('advanced.appDesc') : t('advanced.passkeyDesc') }}
      </p>

      <template v-if="method === 'email'">
        <Textarea v-model="code" class="advanced-code-input" rows="4" auto-resize
          :disabled="verifying" :placeholder="t('advanced.codePlaceholder')"
          :aria-label="t('advanced.code')" fluid />
        <span class="advanced-count">{{ normalizedCode.length }} / {{ ADMIN_ADVANCED_CODE_LENGTH }}</span>
      </template>

      <div v-else-if="method === 'app'" class="advanced-code">
        <ConsoleOtpInput v-model="code" :length="6" :columns="6" integer-only id-prefix="advanced-code"
          :label-template="t('aria.appDigit')" :aria-label="t('advanced.appCode')" :disabled="verifying" />
      </div>

      <p v-if="error" class="advanced-error" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <Button :label="t('common.cancel')" severity="secondary" text :disabled="verifying"
        @click="settleAdvanced(false)" />
      <Button v-if="method === 'email'"
        :label="resendIn > 0 ? t('common.sendIn', { seconds: resendIn }) : t('common.sendCode')"
        severity="secondary" outlined :disabled="resendIn > 0 || sending || verifying" :loading="sending"
        @click="sendCode" />
      <Button :label="method === 'passkey' ? t('advanced.usePasskey') : t('common.confirm')" :loading="verifying"
        :disabled="!canVerify || verifying" @click="verify" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ADMIN_ADVANCED_CODE_LENGTH } from '#shared/utils/admin'

// 高级权限验证弹窗：使用「安全登录」页选定的验证方式，通过后授权 10 分钟
type Method = 'email' | 'app' | 'passkey'

const { t } = useConsoleI18n()
const toast = useToast()
const { user } = useAdminAuth()
const { visible, settleAdvanced, setGrant } = useAdminAdvanced()

const method = computed<Method>(() => {
  const configured = user.value?.advancedMethod
  if (configured === 'app' && user.value?.appBound) return 'app'
  if (configured === 'passkey' && user.value?.passkeyCount) return 'passkey'
  return 'email'
})
const methodLabel = computed(() => t(`advanced.method.${method.value}`))

const code = ref('')
const error = ref('')
const sending = ref(false)
const verifying = ref(false)
const resendIn = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const normalizedCode = computed(() =>
  method.value === 'app' ? code.value.trim() : code.value.replace(/\s+/g, ''))

const canVerify = computed(() => {
  if (method.value === 'passkey') return true
  if (method.value === 'app') return /^\d{6}$/.test(normalizedCode.value)
  return normalizedCode.value.length === ADMIN_ADVANCED_CODE_LENGTH
})

onBeforeUnmount(stopCountdown)

watch(visible, open => {
  if (!open) {
    stopCountdown()
    return
  }
  code.value = ''
  error.value = ''
  resendIn.value = 0
  sending.value = false
  verifying.value = false
  if (method.value === 'email') void sendCode()
})

function stopCountdown() {
  if (timer) clearInterval(timer)
  timer = null
}

function startCountdown(seconds: number) {
  stopCountdown()
  resendIn.value = Math.max(0, Math.ceil(seconds))
  timer = setInterval(() => {
    resendIn.value = Math.max(0, resendIn.value - 1)
    if (resendIn.value === 0) stopCountdown()
  }, 1000)
}

function apiError(err: unknown, fallbackKey: string) {
  const e = err as {
    statusCode?: number
    statusMessage?: string
    data?: { data?: { code?: string, retryAfterSeconds?: number } }
  }
  if (e.data?.data?.code === 'ADVANCED_REQUIRED') return t('advanced.required')
  const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
  if (e.statusCode === 429 || e.statusCode === 423) {
    return retry >= 60 ? t('common.tooManyInMin', { minutes: Math.ceil(retry / 60) }) : t('common.tooMany')
  }
  if (e.statusCode === 410) return t('common.stepExpired')
  if (e.statusCode === 400) return t(fallbackKey)
  return e.statusMessage ?? t(fallbackKey)
}

function complete(res: { expiresInSeconds: number }) {
  setGrant(res.expiresInSeconds)
  toast.add({ severity: 'success', summary: t('advanced.verified'), life: 3000 })
  settleAdvanced(true)
}

async function sendCode() {
  if (method.value !== 'email' || sending.value || resendIn.value > 0) return
  sending.value = true
  error.value = ''
  try {
    const res = await $fetch<{ resendAfterSeconds: number }>('/api/dashboard/security/advanced/send', { method: 'POST' })
    startCountdown(res.resendAfterSeconds)
    await nextTick()
    document.querySelector<HTMLTextAreaElement>('.advanced-code-input')?.focus()
  } catch (err) {
    const retry = Math.ceil(Number((err as { data?: { data?: { retryAfterSeconds?: number } } })
      .data?.data?.retryAfterSeconds ?? 0))
    if (retry > 0) startCountdown(retry)
    error.value = apiError(err, 'advanced.sendFailed')
  } finally {
    sending.value = false
  }
}

async function verify() {
  if (verifying.value || !canVerify.value) return
  if (method.value === 'passkey') {
    await verifyPasskey()
    return
  }
  verifying.value = true
  error.value = ''
  try {
    const url = method.value === 'app'
      ? '/api/dashboard/security/advanced/totp'
      : '/api/dashboard/security/advanced/verify'
    const res = await $fetch<{ expiresInSeconds: number }>(url, {
      method: 'POST',
      body: { code: normalizedCode.value }
    })
    complete(res)
  } catch (err) {
    error.value = apiError(err, method.value === 'app' ? 'advanced.appFailed' : 'advanced.verifyFailed')
  } finally {
    verifying.value = false
  }
}

async function verifyPasskey() {
  if (verifying.value) return
  verifying.value = true
  error.value = ''
  try {
    const { startAuthentication } = await import('@simplewebauthn/browser')
    const { options } = await $fetch<{ options: Parameters<typeof startAuthentication>[0]['optionsJSON'] }>(
      '/api/dashboard/security/advanced/passkey/options',
      { method: 'POST' }
    )
    let response
    try {
      response = await startAuthentication({ optionsJSON: options })
    } catch {
      toast.add({ severity: 'info', summary: t('advanced.passkeyCancelled'), life: 4000 })
      return
    }
    const res = await $fetch<{ expiresInSeconds: number }>(
      '/api/dashboard/security/advanced/passkey/verify',
      { method: 'POST', body: { response } }
    )
    complete(res)
  } catch (err) {
    error.value = apiError(err, 'advanced.passkeyFailed')
  } finally {
    verifying.value = false
  }
}

function onHide() {
  stopCountdown()
  settleAdvanced(false)
}
</script>

<style scoped lang="scss">
.advanced-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.advanced-method-line {
  margin: 0;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.advanced-method-link {
  margin-left: 0.35rem;
  color: var(--p-primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.advanced-desc {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.65;
  color: var(--p-text-muted-color);
}

.advanced-code {
  display: flex;
  width: 100%;
}

.advanced-code-input {
  width: 100%;
  font-family: var(--font-code);
  font-size: 0.8rem;
  line-height: 1.55;
  word-break: break-all;
}

.advanced-count {
  align-self: flex-end;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
  font-variant-numeric: tabular-nums;
}

.advanced-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-red-500, #ef4444);
}
</style>
