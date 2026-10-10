<template>
  <div class="auth-page">
    <form class="auth-card" novalidate @submit.prevent="onSubmit">
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

        <ClientOnly v-if="hcaptchaSitekey">
          <VueHcaptcha ref="captchaRef" size="invisible" :sitekey="hcaptchaSitekey" @expired="onCaptchaExpired"
            @error="onCaptchaExpired" />
        </ClientOnly>

        <Button type="submit" label="Next" :loading="submitting" fluid />

        <Button type="button" severity="secondary" outlined fluid class="alt-btn">
          <Github aria-hidden="true" />
          <span>Continue with GitHub</span>
        </Button>

        <Button type="button" severity="secondary" outlined fluid class="alt-btn">
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

      <template v-else>
        <p class="auth-hint">Set up your profile for <strong>{{ email }}</strong> — optional, you can also do this later</p>

        <IconField>
          <InputIcon>
            <User :size="16" />
          </InputIcon>
          <InputText v-model="nickname" class="auth-input" :class="{ 'p-invalid': !!error }" autocomplete="nickname"
            placeholder="Nickname" aria-label="Nickname" />
        </IconField>
        <IconField>
          <InputIcon>
            <Lock :size="16" />
          </InputIcon>
          <InputText v-model="password" class="auth-input" :class="{ 'p-invalid': !!error }" type="password"
            autocomplete="new-password" placeholder="Password" aria-label="Password" />
        </IconField>
        <IconField>
          <InputIcon>
            <Lock :size="16" />
          </InputIcon>
          <InputText v-model="confirmPassword" class="auth-input" :class="{ 'p-invalid': !!error }" type="password"
            autocomplete="new-password" placeholder="Confirm password" aria-label="Confirm password" />
        </IconField>
        <small v-if="error" class="auth-error" role="alert">{{ error }}</small>
        <Button type="submit" label="Save" :loading="submitting" fluid />

        <Button type="button" variant="text" severity="secondary" size="small" label="Skip for now" @click="skipInit" />
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
import Lock from '@primeicons/vue/lock'
import User from '@primeicons/vue/user'

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

type Step = 'email' | 'code' | 'init'

const step = ref<Step>('email')
const email = ref('')
const code = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)
const sessionId = ref('')
const resendIn = ref(0)
const otpEl = ref<{ $el?: HTMLElement } | null>(null)

let resendTimer: ReturnType<typeof setInterval> | undefined

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 昵称 / 密码校验规则统一来自 shared/utils/validators.ts（isValidNickname / isValidPassword）

const resendLabel = computed(() =>
  resendIn.value > 0 ? `Resend code in ${resendIn.value}s` : 'Resend code'
)

// 输入时清除旧错误
watch(email, () => {
  if (error.value) error.value = ''
})
watch([nickname, password, confirmPassword], () => {
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
    const res = await $fetch<{ email: string; isNewUser: boolean }>('/api/auth/email/verify-code', {
      method: 'POST',
      body: { sessionId: sessionId.value, code: code.value }
    })
    email.value = res.email
    await refreshAuth()
    if (res.isNewUser) {
      step.value = 'init'
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

// 初始化提醒（可选）：昵称与密码均可留空，留空等同跳过
async function saveProfile() {
  if (submitting.value) return
  const nick = nickname.value.trim()
  if (nick && !isValidNickname(nick)) {
    error.value = 'Nickname must be 2-20 characters (letters, numbers, _ or -).'
    return
  }
  if (password.value && !isValidPassword(password.value)) {
    error.value = 'Password must be 6-20 characters with at least one letter and one number (letters, numbers, _ or -).'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/profile', {
      method: 'PATCH',
      body: { nickname: nick || undefined, password: password.value || undefined }
    })
    await navigateTo('/account')
  } catch (err) {
    const e = err as { statusCode?: number; data?: { data?: { field?: string } } }
    if (e.statusCode === 401) {
      error.value = 'Your session has expired. Please sign in again.'
    } else if (e.statusCode === 400) {
      const field = e.data?.data?.field
      error.value = field === 'nickname'
        ? 'Nickname must be 2-20 characters (letters, numbers, _ or -).'
        : field === 'password'
          ? 'Password must be 6-20 characters with at least one letter and one number (letters, numbers, _ or -).'
          : 'Please check your input.'
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
  if (step.value === 'init') return saveProfile()
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

async function skipInit() {
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
</style>
