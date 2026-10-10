<template>
  <div class="auth-page">
    <form class="auth-card" :class="{ 'auth-card--wide': step === 'init' }" novalidate @submit.prevent="onSubmit">
      <h1 class="auth-title">Sign In / Sign Up</h1>

      <template v-if="step === 'email'">
        <p class="auth-hint">Enter your email to sign in or create an account</p>

        <IconField>
          <InputIcon>
            <Envelope :size="16" />
          </InputIcon>
          <InputText v-model="email" class="auth-input" :class="{ 'p-invalid': !!error }" type="email"
            autocomplete="email" autofocus placeholder="you@example.com" aria-label="Email" />
        </IconField>
        <small v-if="error" class="auth-error" role="alert">{{ error }}</small>
        <small v-if="githubError" class="auth-error" role="alert">{{ githubError }}</small>
        <small v-if="passkeyError" class="auth-error" role="alert">{{ passkeyError }}</small>

        <ClientOnly v-if="hcaptchaSitekey">
          <VueHcaptcha ref="captchaRef" size="invisible" :sitekey="hcaptchaSitekey" @expired="onCaptchaExpired"
            @error="onCaptchaExpired" />
        </ClientOnly>

        <Button type="submit" label="Next" :loading="submitting" fluid />

        <Button type="button" severity="secondary" outlined fluid class="alt-btn" @click="githubSignIn">
          <Github aria-hidden="true" />
          <span>Continue with GitHub</span>
        </Button>

        <Button type="button" severity="secondary" outlined fluid class="alt-btn" :loading="passkeyBusy"
          @click="passkeySignIn">
          <Key aria-hidden="true" />
          <span>Sign in with Passkey</span>
        </Button>
      </template>

      <template v-else-if="step === 'code'">
        <p class="auth-hint">Enter the 6-digit code sent to <strong>{{ email }}</strong></p>

        <div class="otp-row">
          <Key :size="16" class="otp-key" />
          <InputOtp ref="otpEl" v-model="code" :length="6" integer-only />
        </div>
        <small v-if="error" class="auth-error" role="alert">{{ error }}</small>
        <Button type="submit" label="Verify" :disabled="code.length !== 6" :loading="submitting" fluid />

        <div class="code-actions">
          <Button type="button" variant="text" severity="secondary" size="small" :label="resendLabel"
            :disabled="resendIn > 0 || submitting" @click="requestCode" />
          <Button type="button" variant="text" severity="secondary" size="small" label="Use a different email"
            @click="backToEmail" />
        </div>
      </template>

      <template v-else-if="step === '2fa'">
        <p class="auth-hint">Two-step verification for <strong>{{ twoFaAccount }}</strong></p>

        <template v-if="!showRecovery">
          <div v-if="twoFaMethods.includes('app')" class="otp-row">
            <Key :size="16" class="otp-key" />
            <InputOtp ref="otpEl" v-model="twoFaCode" :length="6" integer-only />
          </div>
        </template>
        <template v-else>
          <InputText v-model="recoveryCode" placeholder="Recovery code" aria-label="Recovery code" />
        </template>

        <small v-if="twoFaError" class="auth-error" role="alert">{{ twoFaError }}</small>

        <Button v-if="!showRecovery && twoFaMethods.includes('app')" type="submit" label="Verify"
          :disabled="twoFaCode.length !== 6" :loading="twoFaBusy" fluid />

        <Button v-if="!showRecovery && twoFaMethods.includes('passkey')" type="button" severity="secondary" outlined
          fluid class="alt-btn" :loading="passkeyBusy" @click="twoFaPasskey">
          <Key aria-hidden="true" />
          <span>Use a passkey</span>
        </Button>

        <Button v-if="showRecovery" type="submit" label="Verify" :disabled="!recoveryCode" :loading="twoFaBusy" fluid />

        <div class="code-actions">
          <Button type="button" variant="text" severity="secondary" size="small"
            :label="showRecovery ? 'Use an app code' : 'Use a recovery code'"
            @click="toggleRecovery" />
        </div>
      </template>

      <template v-else>
        <p class="auth-hint">Set up your profile for <strong>{{ email }}</strong> — optional, you can also do this later</p>

        <div class="setup">
          <div class="setup-row">
            <div class="setup-main">
              <span class="setup-label">Username
                <ExclamationTriangle v-if="!usernameSet" class="row-warn" aria-label="Action required" />
              </span>
              <span class="setup-desc">Your unique handle. This cannot be changed once set.</span>
            </div>
            <div class="setup-control">
              <span v-if="usernameSet" class="setup-value">{{ authUser?.username }}</span>
              <Button v-else label="Set" severity="secondary" outlined size="small" @click="usernameOpen = true" />
            </div>
          </div>

          <div class="setup-row">
            <div class="setup-main">
              <span class="setup-label">Nickname</span>
              <span class="setup-desc">This is how others will see you.</span>
            </div>
            <div class="setup-control">
              <Button :label="authUser?.nickname ? 'Change' : 'Set'" severity="secondary" outlined size="small"
                @click="nicknameOpen = true" />
            </div>
          </div>

          <div class="setup-row">
            <div class="setup-main">
              <span class="setup-label">Password
                <ExclamationTriangle v-if="!hasPassword" class="row-warn" aria-label="Action required" />
              </span>
              <span class="setup-desc">
                {{ hasPassword ? 'Change your sign-in password.' : 'No password set. Set one to sign in without an email code.' }}
              </span>
            </div>
            <div class="setup-control">
              <Button :label="hasPassword ? 'Change password' : 'Set password'" severity="secondary" outlined size="small"
                @click="passwordOpen = true" />
            </div>
          </div>
        </div>

        <Button type="button" label="Done" fluid @click="finishInit" />

        <UsernameDialog v-model="usernameOpen" />
        <NicknameDialog v-model="nicknameOpen" />
        <PasswordDialog v-model="passwordOpen" />
      </template>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha'
import Github from '@primeicons/vue/github'
import Envelope from '@primeicons/vue/envelope'
import Key from '@primeicons/vue/key'
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'

useHead({ title: 'Sign In / Sign Up' })

const { user: authUser, refresh: refreshAuth } = useAuthUser()

// hCaptcha：sitekey 未配置（未填写 .env）时不渲染、不校验
const runtimeConfig = useRuntimeConfig()
const hcaptchaSitekey = runtimeConfig.public.hcaptchaSitekey
const devMode = runtimeConfig.public.devMode
const captchaRef = ref<{ reset: () => void; executeAsync: () => Promise<{ response: string; key: string }> } | null>(null)
const captchaToken = ref('')

function onCaptchaExpired() {
  captchaToken.value = ''
}
function resetCaptcha() {
  captchaToken.value = ''
  captchaRef.value?.reset()
}

type Step = 'email' | 'code' | '2fa' | 'init'

const step = ref<Step>('email')
const email = ref('')
const code = ref('')
const error = ref('')
const submitting = ref(false)
const sessionId = ref('')
const resendIn = ref(0)
const otpEl = ref<{ $el?: HTMLElement } | null>(null)

// 初始化步骤：用户名 / 昵称 / 密码弹窗开关
const usernameOpen = ref(false)
const nicknameOpen = ref(false)
const passwordOpen = ref(false)
const usernameSet = computed(() => authUser.value?.usernameSet ?? false)
const hasPassword = computed(() => authUser.value?.hasPassword ?? false)

// GitHub 登录：跳转到后端 OAuth 起跳端点（回调失败时以 ?github_error= 方式带回）
const route = useRoute()
const githubError = ref('')

// 两步验证（第二因子）状态
const twoFaTicket = ref('')
const twoFaMethods = ref<string[]>([])
const twoFaAccount = ref('')
const twoFaCode = ref('')
const recoveryCode = ref('')
const twoFaError = ref('')
const twoFaBusy = ref(false)
const showRecovery = ref(false)

function enterTwoFactor(ticket: string, methods: string[], account: string) {
  twoFaTicket.value = ticket
  twoFaMethods.value = methods
  twoFaAccount.value = account
  twoFaCode.value = ''
  recoveryCode.value = ''
  twoFaError.value = ''
  showRecovery.value = false
  step.value = '2fa'
  nextTick(() => otpEl.value?.$el?.querySelector('input')?.focus())
}

function toggleRecovery() {
  showRecovery.value = !showRecovery.value
  twoFaError.value = ''
}

function twoFaErr(err: unknown) {
  const status = (err as { statusCode?: number })?.statusCode
  if (status === 410) return 'Too many attempts or expired. Please sign in again.'
  if (status === 400) return showRecovery.value ? 'Invalid recovery code.' : 'Incorrect code.'
  if (status === 403) return 'This account has been disabled.'
  return 'Something went wrong. Please try again.'
}

async function twoFaAppVerify() {
  if (twoFaBusy.value) return
  twoFaBusy.value = true
  twoFaError.value = ''
  try {
    await $fetch('/api/auth/2fa/app/verify', {
      method: 'POST',
      body: { ticket: twoFaTicket.value, code: twoFaCode.value }
    })
    await refreshAuth()
    await navigateTo('/account')
  } catch (err) {
    twoFaError.value = twoFaErr(err)
  } finally {
    twoFaBusy.value = false
  }
}

async function twoFaRecoveryVerify() {
  if (twoFaBusy.value) return
  twoFaBusy.value = true
  twoFaError.value = ''
  try {
    await $fetch('/api/auth/2fa/recovery/verify', {
      method: 'POST',
      body: { ticket: twoFaTicket.value, code: recoveryCode.value }
    })
    await refreshAuth()
    await navigateTo('/account')
  } catch (err) {
    twoFaError.value = twoFaErr(err)
  } finally {
    twoFaBusy.value = false
  }
}

async function twoFaPasskey() {
  if (passkeyBusy.value) return
  passkeyBusy.value = true
  twoFaError.value = ''
  try {
    const { startAuthentication, browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
    if (!browserSupportsWebAuthn()) {
      twoFaError.value = 'Passkeys are not supported on this device.'
      return
    }
    const { options, challengeId } = await $fetch<{
      options: Parameters<typeof startAuthentication>[0]
      challengeId: string
    }>('/api/auth/2fa/passkey/options', { method: 'POST', body: { ticket: twoFaTicket.value } })
    let assertion
    try {
      assertion = await startAuthentication(options)
    } catch {
      twoFaError.value = 'Passkey verification was cancelled.'
      return
    }
    await $fetch('/api/auth/2fa/passkey/verify', {
      method: 'POST',
      body: { ticket: twoFaTicket.value, challengeId, response: assertion }
    })
    await refreshAuth()
    await navigateTo('/account')
  } catch (err) {
    twoFaError.value = twoFaErr(err)
  } finally {
    passkeyBusy.value = false
  }
}

onMounted(async () => {
  const e = route.query.github_error
  if (e) {
    githubError.value = String(e)
    navigateTo({ path: route.path, query: {} }, { replace: true })
    return
  }
  // GitHub 两步验证：回调跳回 ?twofa=<ticket>，读取可用第二因子后进入验证步骤
  const t = route.query.twofa
  if (t) {
    navigateTo({ path: route.path, query: {} }, { replace: true })
    try {
      const res = await $fetch<{ account: string; methods: string[] }>('/api/auth/2fa/pending', {
        method: 'POST',
        body: { ticket: String(t) }
      })
      enterTwoFactor(String(t), res.methods, res.account)
    } catch (err) {
      githubError.value =
        (err as { statusCode?: number })?.statusCode === 410
          ? 'This sign-in attempt has expired. Please try again.'
          : 'Sign-in failed. Please try again.'
    }
  }
})

function githubSignIn() {
  window.location.href = '/api/auth/github/authorize?mode=login'
}

// Passkey 登录（无用户名）：开始认证 → 浏览器通行密钥 → 服务端校验 → 登录
const passkeyBusy = ref(false)
const passkeyError = ref('')
async function passkeySignIn() {
  if (passkeyBusy.value) return
  passkeyBusy.value = true
  passkeyError.value = ''
  try {
    const { startAuthentication, browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
    if (!browserSupportsWebAuthn()) {
      passkeyError.value = 'Passkeys are not supported on this device.'
      return
    }
    const { options, challengeId } = await $fetch<{
      options: Parameters<typeof startAuthentication>[0]
      challengeId: string
    }>('/api/auth/passkey/login/options', { method: 'POST' })

    let assertion
    try {
      assertion = await startAuthentication(options)
    } catch {
      passkeyError.value = 'Passkey sign-in was cancelled.'
      return
    }

    await $fetch('/api/auth/passkey/login/verify', {
      method: 'POST',
      body: { challengeId, response: assertion }
    })
    await refreshAuth()
    await navigateTo('/account')
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode
    if (status === 404) passkeyError.value = 'No account is linked to this passkey.'
    else if (status === 410) passkeyError.value = 'This sign-in attempt has expired. Please try again.'
    else if (status === 403) passkeyError.value = 'This account has been disabled.'
    else passkeyError.value = 'Passkey sign-in failed. Please try again.'
  } finally {
    passkeyBusy.value = false
  }
}

let resendTimer: ReturnType<typeof setInterval> | undefined

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const resendLabel = computed(() =>
  resendIn.value > 0 ? `Resend code in ${resendIn.value}s` : 'Resend code'
)

// 输入时清除旧错误
watch(email, () => {
  if (error.value) error.value = ''
})

onUnmounted(() => clearInterval(resendTimer))

function startCountdown(seconds: number) {
  clearInterval(resendTimer)
  resendIn.value = Math.max(0, Math.ceil(seconds))
  resendTimer = setInterval(() => {
    resendIn.value = Math.max(0, resendIn.value - 1)
    if (resendIn.value === 0) clearInterval(resendTimer)
  }, 1000)
}

// 按状态码生成用户提示；429 时顺带取回剩余等待秒数
function apiErrorMessage(err: unknown, retrySeconds: number): string {
  const status = (err as { statusCode?: number })?.statusCode
  if (status === 429) {
    if (retrySeconds > 0) {
      return retrySeconds >= 60
        ? `Too many requests. Please try again in ${Math.ceil(retrySeconds / 60)} min.`
        : `Too many requests. Please try again in ${retrySeconds}s.`
    }
    return 'Too many requests, please try again later.'
  }
  if (status === 502) return 'Could not send the email. Please try again.'
  return 'Something went wrong. Please try again.'
}

// 发送验证码：首次进入验证码步骤 / 点击重发
async function requestCode() {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{
      sessionId: string
      resendAfterSeconds: number
    }>('/api/auth/email/send-code', {
      method: 'POST',
      body: { email: email.value, captchaToken: captchaToken.value || undefined }
    })

    sessionId.value = res.sessionId
    code.value = ''
    step.value = 'code'
    startCountdown(res.resendAfterSeconds)

    await nextTick()
    otpEl.value?.$el?.querySelector('input')?.focus()
  } catch (err) {
    resetCaptcha()
    const e = err as { statusCode?: number; data?: { data?: { captcha?: boolean; retryAfterSeconds?: number } } }
    if (e.data?.data?.captcha) {
      error.value = 'Human verification failed. Please try again.'
    } else {
      const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
      error.value = apiErrorMessage(err, retry)
      if (retry > 0) startCountdown(retry)
    }
  } finally {
    submitting.value = false
  }
}

// 校验验证码：通过即登录（未注册邮箱后端已自动完成基础注册）→ 账户页；新账户先显示可选初始化提醒
async function verifyCode() {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{
      email: string
      isNewUser: boolean
      requires2fa?: boolean
      ticket?: string
      methods?: string[]
    }>('/api/auth/email/verify-code', {
      method: 'POST',
      body: { sessionId: sessionId.value, code: code.value }
    })
    email.value = res.email
    await refreshAuth()
    if (res.isNewUser) {
      step.value = 'init'
    } else if (res.requires2fa) {
      enterTwoFactor(res.ticket ?? '', res.methods ?? [], res.email)
    } else {
      await navigateTo('/account')
    }
  } catch (err) {
    const e = err as { statusCode?: number; data?: { data?: { attemptsLeft?: number; retryAfterSeconds?: number } } }
    if (e.statusCode === 423) {
      const mins = Math.ceil((e.data?.data?.retryAfterSeconds ?? 0) / 60)
      error.value = mins > 0
        ? `Too many incorrect codes. This account is locked for ${mins} min.`
        : 'Too many incorrect codes. This account is temporarily locked.'
    } else if (e.statusCode === 410) {
      error.value = 'This code has expired. Please request a new one.'
    } else if (e.statusCode === 403) {
      error.value = 'This account has been disabled.'
    } else if (e.statusCode === 400 && e.data?.data?.attemptsLeft != null) {
      const left = e.data.data.attemptsLeft
      error.value = `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

function onSubmit() {
  if (step.value === 'email') return handleNext()
  if (step.value === 'code') return verifyCode()
  if (step.value === '2fa') return showRecovery.value ? twoFaRecoveryVerify() : twoFaAppVerify()
}

async function handleNext() {
  const value = email.value.trim().toLowerCase()
  if (!EMAIL_RE.test(value)) {
    error.value = 'Please enter a valid email address'
    return
  }
  if (!isAllowedEmail(value)) {
    error.value = 'Please use a supported email provider'
    return
  }
  email.value = value

  // 人机校验：隐藏式组件，点击 Next 时用内置方法调起（dev 环境同样调起）
  // 生产环境必须有 token；开发环境（MODE=dev）取不到也放行，由后端跳过校验
  if (hcaptchaSitekey) {
    try {
      captchaToken.value = (await captchaRef.value?.executeAsync())?.response ?? ''
    } catch {
      captchaToken.value = ''
    }
    if (!devMode && !captchaToken.value) {
      error.value = 'Human verification failed. Please try again.'
      return
    }
  }
  return requestCode()
}

function backToEmail() {
  step.value = 'email'
  code.value = ''
  error.value = ''
  resendIn.value = 0
  clearInterval(resendTimer)
  resetCaptcha()
}

async function finishInit() {
  await navigateTo('/account')
}

// 已登录（含刷新场景）直接进入账户页，并同步导航栏登录态
const { data: session } = await useFetch<{ user: AuthUser }>('/api/auth/me')
if (session.value?.user) {
  authUser.value = session.value.user
  await navigateTo('/account')
}
</script>

<style scoped>
.auth-page {
  min-height: 65vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem;
}

.auth-card {
  width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.auth-card--wide {
  width: min(540px, 100%);
}

.auth-title {
  margin: 0;
  font-size: 1.75rem;
  text-align: center;
}

.auth-hint {
  margin: 0 0 0.6rem;
  text-align: center;
  color: var(--p-text-muted-color);
  font-size: 0.95rem;
}

.auth-input {
  width: 100%;
}

/* 聚焦时也保留 invalid 红色边框（默认主题 focus 边框会盖过 invalid） */
.auth-input.p-invalid,
.auth-input.p-invalid:focus {
  border-color: var(--p-inputtext-invalid-border-color);
}

.auth-error {
  color: var(--p-red-500);
  font-size: 0.9rem;
}

.alt-btn svg {
  width: 1.25em;
  height: 1.25em;
}

.otp-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  align-self: center;
}

.otp-key {
  color: var(--p-text-muted-color);
}

.code-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

/* 初始化步骤：账户设置风格的「左文案右按钮」列表 */
.setup {
  border: 1px solid var(--p-content-border-color);
  border-radius: 12px;
  overflow: hidden;
}

.setup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;

  & + .setup-row {
    border-top: 1px solid var(--p-content-border-color);
  }
}

.setup-main {
  min-width: 0;
}

.setup-label {
  display: block;
  font-size: 0.92rem;
  font-weight: 500;
}

.setup-desc {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.setup-value {
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.row-warn {
  width: 0.9em;
  height: 0.9em;
  margin-left: 0.35rem;
  color: var(--p-orange-500);
  vertical-align: -0.12em;
}
</style>
