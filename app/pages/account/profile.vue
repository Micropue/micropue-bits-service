<template>
  <h2 class="section-title">Account</h2>

  <section class="group">
    <h3 class="group-title">Profile</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Username <ExclamationTriangle v-if="!usernameSet" class="row-warn"
              aria-label="Action required" /></span>
          <span class="row-desc">Your unique handle. This cannot be changed once set.</span>
        </div>
        <div class="row-control value-action">
          <template v-if="usernameSet">
            <span class="row-value">{{ username }}</span>
          </template>
          <template v-else>
            <span class="row-value">Not set</span>
            <Button label="Set" severity="secondary" outlined size="small" @click="usernameOpen = true" />
          </template>
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Nickname</span>
          <span class="row-desc">This is how others will see you.</span>
        </div>
        <div class="row-control value-action">
          <span class="row-value">{{ nickname || '—' }}</span>
          <Button label="Change" severity="secondary" outlined size="small" @click="nickOpen = true" />
        </div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Email</span>
          <span class="row-desc">Your sign-in address.</span>
        </div>
        <div class="row-control value-action">
          <span class="row-value">{{ email || '—' }}</span>
          <Button label="Change" severity="secondary" outlined size="small" @click="openEmail" />
        </div>
      </div>
    </div>
  </section>

  <section class="group">
    <h3 class="group-title">Account Information</h3>
    <div class="card">
      <div class="row">
        <div class="row-main">
          <span class="row-label">Last login</span>
          <span class="row-desc">The last time you signed in.</span>
        </div>
        <div class="row-control"><span class="row-value">{{ lastLoginAt || '—' }}</span></div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Created at</span>
          <span class="row-desc">When your account was created.</span>
        </div>
        <div class="row-control"><span class="row-value">{{ createdAt || '—' }}</span></div>
      </div>
      <div class="row">
        <div class="row-main">
          <span class="row-label">Status</span>
          <span class="row-desc">Your account status.</span>
        </div>
        <div class="row-control">
          <span class="status" :class="isNormal ? 'status--normal' : 'status--disabled'">
            <component :is="isNormal ? CheckCircle : TimesCircle" aria-hidden="true" />
            {{ isNormal ? 'Normal' : 'Disabled' }}
          </span>
        </div>
      </div>
    </div>
  </section>

  <UsernameDialog v-model="usernameOpen" />
  <NicknameDialog v-model="nickOpen" />

  <!-- 修改邮箱 -->
  <Dialog v-model:visible="emailOpen" modal :draggable="false" header="Change email" :style="{ width: '26rem' }">
    <div class="dialog-form">
      <template v-if="!emailCodeSent">
        <InputText v-model="emailPassword" type="password" :class="{ 'p-invalid': !!emailError }"
          autocomplete="current-password" placeholder="Current password" aria-label="Current password" />
        <InputText v-model="emailInput" type="email" :class="{ 'p-invalid': !!emailError }"
          autocomplete="email" placeholder="New email address" aria-label="New email address" />

        <ClientOnly v-if="hcaptchaSitekey">
          <VueHcaptcha ref="captchaRef" size="invisible" :sitekey="hcaptchaSitekey" @expired="onCaptchaExpired"
            @error="onCaptchaExpired" />
        </ClientOnly>

        <small v-if="emailError" class="dialog-error" role="alert">{{ emailError }}</small>
        <Button label="Send code" :loading="emailSending" @click="sendEmailCode" />
      </template>

      <template v-else>
        <InputOtp v-model="emailCode" class="otp-center" :length="6" integer-only />
        <small class="dialog-hint dialog-center">Enter the code sent to {{ emailInput }}</small>
        <small v-if="emailError" class="dialog-error dialog-center" role="alert">{{ emailError }}</small>
        <Button label="Confirm" :disabled="emailCode.length !== 6" :loading="emailConfirming" @click="confirmEmail" />
        <Button variant="text" severity="secondary" size="small" :label="resendLabel"
          :disabled="emailResendIn > 0 || emailSending" @click="sendEmailCode" />
      </template>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emailOpen = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha'
import CheckCircle from '@primeicons/vue/check-circle'
import TimesCircle from '@primeicons/vue/times-circle'
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'

useHead({ title: 'Account' })

const { user, refresh } = useAuthUser()

const email = computed(() => user.value?.email ?? '')
const username = computed(() => user.value?.username ?? '')
const usernameSet = computed(() => user.value?.usernameSet ?? false)
const nickname = computed(() => user.value?.nickname ?? '')
const createdAt = computed(() => user.value?.createdAt ?? '')
const lastLoginAt = computed(() => user.value?.lastLoginAt ?? '')
const isNormal = computed(() => (user.value?.status ?? 'normal') === 'normal')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const runtimeConfig = useRuntimeConfig()
const hcaptchaSitekey = runtimeConfig.public.hcaptchaSitekey
const devMode = runtimeConfig.public.devMode

/* ---------------- 弹窗（用户名 / 昵称） ---------------- */
const usernameOpen = ref(false)
const nickOpen = ref(false)

/* ---------------- 修改邮箱 ---------------- */
const emailOpen = ref(false)
const emailPassword = ref('')
const emailInput = ref('')
const emailCode = ref('')
const emailSessionId = ref('')
const emailCodeSent = ref(false)
const emailError = ref('')
const emailSending = ref(false)
const emailConfirming = ref(false)
const emailResendIn = ref(0)
const captchaRef = ref<{ reset: () => void; executeAsync: () => Promise<{ response: string }> } | null>(null)

let resendTimer: ReturnType<typeof setInterval> | undefined

const resendLabel = computed(() =>
  emailResendIn.value > 0 ? `Resend code in ${emailResendIn.value}s` : 'Resend code'
)

function onCaptchaExpired() {
  // 隐藏式组件自行刷新，无需处理
}

function resetCaptcha() {
  captchaRef.value?.reset()
}

function startCountdown(seconds: number) {
  clearInterval(resendTimer)
  emailResendIn.value = Math.max(0, Math.ceil(seconds))
  resendTimer = setInterval(() => {
    emailResendIn.value = Math.max(0, emailResendIn.value - 1)
    if (emailResendIn.value === 0) clearInterval(resendTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(resendTimer))

function openEmail() {
  emailPassword.value = ''
  emailInput.value = ''
  emailCode.value = ''
  emailSessionId.value = ''
  emailCodeSent.value = false
  emailError.value = ''
  emailResendIn.value = 0
  clearInterval(resendTimer)
  resetCaptcha()
  emailOpen.value = true
}

function emailErrorMessage(err: unknown): string {
  const e = err as {
    statusCode?: number
    data?: { data?: { field?: string; code?: string; attemptsLeft?: number; retryAfterSeconds?: number } }
  }
  const status = e.statusCode
  const d = e.data?.data
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 409 && d?.code === 'NO_PASSWORD') return 'Please set a password before changing your email.'
  if (status === 403) return 'Incorrect password.'
  if (status === 409) return 'This email is already in use.'
  if (status === 429) {
    const r = Math.ceil(Number(d?.retryAfterSeconds ?? 0))
    if (r >= 3600) return `Email can only be changed once per day. Try again in ${Math.ceil(r / 3600)} h.`
    return r > 0 ? `Please wait ${r}s before trying again.` : 'Please try again later.'
  }
  if (status === 410) return 'This code has expired. Please request a new one.'
  if (status === 400 && d?.attemptsLeft != null) {
    const left = d.attemptsLeft
    return `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
  }
  if (status === 400) return 'Please check your input and try again.'
  if (status === 502) return 'Could not send the email. Please try again.'
  return 'Something went wrong. Please try again.'
}

async function sendEmailCode() {
  if (emailSending.value) return
  const value = emailInput.value.trim().toLowerCase()
  if (!emailPassword.value) {
    emailError.value = 'Please enter your current password.'
    return
  }
  if (!EMAIL_RE.test(value) || !isAllowedEmail(value)) {
    emailError.value = 'Please enter a valid, supported email address.'
    return
  }
  if (value === email.value.toLowerCase()) {
    emailError.value = 'This is already your email.'
    return
  }

  emailSending.value = true
  emailError.value = ''
  try {
    let captchaToken = ''
    if (hcaptchaSitekey) {
      try {
        captchaToken = (await captchaRef.value?.executeAsync())?.response ?? ''
      } catch {
        captchaToken = ''
      }
      if (!devMode && !captchaToken) {
        emailError.value = 'Human verification failed. Please try again.'
        return
      }
    }

    const res = await $fetch<{ sessionId: string; resendAfterSeconds: number }>(
      '/api/auth/email/change/send-code',
      { method: 'POST', body: { password: emailPassword.value, email: value, captchaToken: captchaToken || undefined } }
    )
    emailInput.value = value
    emailSessionId.value = res.sessionId
    emailCode.value = ''
    emailCodeSent.value = true
    startCountdown(res.resendAfterSeconds)
  } catch (err) {
    resetCaptcha()
    emailError.value = emailErrorMessage(err)
    const retry = Math.ceil(Number((err as { data?: { data?: { retryAfterSeconds?: number } } })?.data?.data?.retryAfterSeconds ?? 0))
    if (retry > 0 && retry < 3600) startCountdown(retry)
  } finally {
    emailSending.value = false
  }
}

async function confirmEmail() {
  if (emailConfirming.value) return
  emailConfirming.value = true
  emailError.value = ''
  try {
    await $fetch('/api/auth/email/change/confirm', {
      method: 'POST',
      body: { password: emailPassword.value, sessionId: emailSessionId.value, code: emailCode.value }
    })
    await refresh()
    emailOpen.value = false
  } catch (err) {
    emailError.value = emailErrorMessage(err)
  } finally {
    emailConfirming.value = false
  }
}
</script>

<style scoped lang="scss">
.status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;

  svg {
    width: 1.05em;
    height: 1.05em;
    flex-shrink: 0;
  }

  &--normal {
    color: var(--p-green-500);

    svg {
      color: var(--p-green-500);
    }
  }

  &--disabled {
    color: var(--p-red-500);

    svg {
      color: var(--p-red-500);
    }
  }
}

.value-action {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.row-warn {
  width: 0.9em;
  height: 0.9em;
  margin-left: 0.35rem;
  color: var(--p-orange-500);
  vertical-align: -0.12em;
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

/* 验证码步骤：整体居中 */
.otp-center {
  align-self: center;
}

.dialog-center {
  text-align: center;
}
</style>
