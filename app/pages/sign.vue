<template>
  <div class="auth-page">
    <form class="auth-card" novalidate @submit.prevent="onSubmit">
      <h1 class="auth-title">Sign In / Sign Up</h1>

      <template v-if="step === 'email'">
        <p class="auth-hint">Enter your email to sign in or create an account</p>

        <InputText v-model="email" class="auth-input" :class="{ 'p-invalid': !!error }" type="email"
          autocomplete="email" autofocus placeholder="you@example.com" aria-label="Email" />
        <small v-if="error" class="auth-error" role="alert">{{ error }}</small>
        <Button type="submit" label="Next" :loading="submitting" fluid />

        <Button type="button" severity="secondary" outlined fluid class="github-btn">
          <Github aria-hidden="true" />
          <span>Continue with GitHub</span>
        </Button>
      </template>

      <template v-else>
        <p class="auth-hint">Enter the 6-digit code sent to <strong>{{ email }}</strong></p>

        <InputOtp ref="otpEl" v-model="code" class="auth-otp" :length="6" integer-only />
        <small v-if="error" class="auth-error" role="alert">{{ error }}</small>
        <!-- TODO: 校验验证码：已注册用户校验通过后登录；未注册暂不继续 -->
        <Button type="submit" label="Verify" :disabled="code.length !== 6" fluid />

        <div class="code-actions">
          <Button type="button" variant="text" severity="secondary" size="small" :label="resendLabel"
            :disabled="resendIn > 0 || submitting" @click="requestCode" />
          <Button type="button" variant="text" severity="secondary" size="small" label="Use a different email"
            @click="backToEmail" />
        </div>
      </template>
    </form>
  </div>
</template>

<script setup lang="ts">
import Github from '@primeicons/vue/github'

useHead({ title: 'Sign In / Sign Up' })

type Step = 'email' | 'code'

const step = ref<Step>('email')
const email = ref('')
const code = ref('')
const error = ref('')
const submitting = ref(false)
const sessionId = ref('')
const registered = ref(false)
const resendIn = ref(0)
const otpEl = ref<{ $el?: HTMLElement } | null>(null)

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
      registered: boolean
      resendAfterSeconds: number
    }>('/api/auth/email/send-code', { method: 'POST', body: { email: email.value } })

    sessionId.value = res.sessionId
    registered.value = res.registered
    code.value = ''
    step.value = 'code'
    startCountdown(res.resendAfterSeconds)

    await nextTick()
    otpEl.value?.$el?.querySelector('input')?.focus()
  } catch (err) {
    const retry = Math.ceil(
      Number((err as { data?: { data?: { retryAfterSeconds?: number } } })?.data?.data?.retryAfterSeconds ?? 0)
    )
    error.value = apiErrorMessage(err, retry)
    if (retry > 0) startCountdown(retry)
  } finally {
    submitting.value = false
  }
}

function onSubmit() {
  if (step.value === 'email') return handleNext()
  // TODO: 验证码校验 + 已注册用户登录
}

function handleNext() {
  const value = email.value.trim().toLowerCase()
  if (!EMAIL_RE.test(value)) {
    error.value = 'Please enter a valid email address'
    return
  }
  email.value = value
  return requestCode()
}

function backToEmail() {
  step.value = 'email'
  code.value = ''
  error.value = ''
  resendIn.value = 0
  clearInterval(resendTimer)
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

.github-btn svg {
  width: 1.25em;
  height: 1.25em;
}

.auth-otp {
  align-self: center;
}

.code-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
</style>
