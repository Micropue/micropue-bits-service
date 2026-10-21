<template>
  <div class="console-auth">
    <div class="auth-card">
      <header class="auth-head">
        <NuxtLink to="/" class="auth-brand" aria-label="MICROPUE Bits">
          <span class="brand-name">MICROPUE</span>
          <span class="brand-product">Bits</span>
        </NuxtLink>
        <div class="auth-head-actions">
          <Tag value="System Console" severity="secondary" rounded />
        </div>
      </header>

      <h1 class="auth-title">{{ panelTitle }}</h1>
      <p class="auth-subtitle">{{ panelSubtitle }}</p>

      <!-- 1) 管理员邮箱 -->
      <form v-if="panel === 'email'" class="auth-form" @submit.prevent="submitEmail">
        <label class="auth-field" for="console-admin-email">
          <span>{{ t('auth.field.email') }}</span>
          <InputText id="console-admin-email" v-model="email" name="email" type="email" autocomplete="email"
            placeholder="admin@example.com" fluid :invalid="!!fieldError" />
        </label>
        <Button type="submit" :label="t('auth.continue')" :loading="submitting" :disabled="!emailValid" fluid />
      </form>

      <!-- 2) 64 位动态码（每行 16 格、每 4 格一组） -->
      <form v-else-if="panel === 'code'" class="auth-form" @submit.prevent="submitCode">
        <ConsoleOtpInput v-model="code" :length="64" :disabled="submitting" id-prefix="signin-code"
          :label-template="t('aria.codeChar')" :aria-label="t('auth.code.title')" />
        <p class="auth-hint">{{ t('auth.code.hint', { email }) }}</p>
        <Button type="submit" :label="t('auth.verify')" :loading="submitting" :disabled="!codeValid" fluid />
        <div class="auth-actions">
          <Button :label="t('auth.code.other')" severity="secondary" text size="small" @click="backToEmail" />
          <Button v-if="resendIn > 0" :label="t('auth.code.resendIn', { seconds: resendIn })" severity="secondary"
            text size="small" disabled />
          <Button v-else :label="t('auth.code.resend')" severity="secondary" text size="small" :disabled="submitting"
            @click="submitEmail" />
        </div>
      </form>

      <!-- 3) AuthApp 六位码 -->
      <form v-else-if="panel === 'app'" class="auth-form" @submit.prevent="submitAppCode">
        <label class="auth-field" for="console-app-email">
          <span>{{ t('auth.field.email') }}</span>
          <InputText id="console-app-email" v-model="email" name="email" type="email" autocomplete="email"
            placeholder="admin@example.com" fluid />
        </label>
        <ConsoleOtpInput v-model="appCode" :length="6" integer-only :disabled="submitting" id-prefix="app-code"
          :label-template="t('aria.appDigit')" :aria-label="t('method.app.label')" />
        <p class="auth-hint">{{ t('auth.app.hint') }}</p>
        <Button type="submit" :label="t('auth.verify')" :loading="submitting" :disabled="!appCodeValid" fluid />
      </form>

      <!-- 4) Passkey -->
      <div v-else class="auth-form">
        <p class="auth-hint">
          {{ t('auth.passkey.hint') }}
        </p>
        <Button :label="t('auth.passkey.continue')" :loading="passkeyBusy" fluid @click="submitPasskey" />
      </div>

      <!-- 其它可用方式（图标按钮） -->
      <div v-if="otherMethods.length" class="auth-alternatives">
        <p class="auth-alternatives-label">{{ t('auth.otherWays') }}</p>
        <div class="auth-alternatives-list">
          <Button v-for="method in otherMethods" :key="method.key" severity="secondary" outlined rounded
            :aria-label="t(method.labelKey)" :title="t(method.labelKey)" @click="switchTo(method.key)">
            <template #icon>
              <component :is="METHOD_ICONS[method.key]" aria-hidden="true" />
            </template>
          </Button>
        </div>
      </div>

      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

      <footer class="auth-foot">
        <Tag :value="t('auth.footer.tag')" severity="secondary" rounded />
        <span>{{ t('auth.footer.text') }}</span>
      </footer>
    </div>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import Envelope from '@primeicons/vue/envelope'
import Key from '@primeicons/vue/key'
import Mobile from '@primeicons/vue/mobile'
import type { AdminAuthMethodKey } from '#shared/utils/admin'
import type { AdminUser } from '~/composables/useAdminAuth'

// 控制台登录：动态邮件码（64 位，4 位一组）/ AuthApp 六位码 / Passkey
// 三种方式均为独立入口：AuthApp 与 Passkey 需管理员先在「安全」页绑定
definePageMeta({ layout: false })

const { user, methods, fetchMethods, fetchSession } = useAdminAuth()
const toast = useToast()
const { t, restoreLocale } = useConsoleI18n()
const route = useRoute()

// 其它登录方式的图标
const METHOD_ICONS: Record<AdminAuthMethodKey, unknown> = { email: Envelope, app: Mobile, passkey: Key }

onMounted(restoreLocale)

// 已登录直接进控制台（带 redirect 时回跳原页面）；未登录先取认证方式开关
if (user.value) {
  await navigateTo(safeRedirect())
} else {
  // 整页刷新后内存态为空：仍需问一次服务端，避免已登录的管理员又看到登录页
  await fetchSession()
  if (user.value) await navigateTo(safeRedirect())
  else await fetchMethods()
}

type Panel = 'email' | 'code' | 'app' | 'passkey'

const email = ref(String(route.query.email ?? ''))
const rawCode = ref('')
const appCode = ref('')
const error = ref('')
const fieldError = ref('')
const submitting = ref(false)
const passkeyBusy = ref(false)
const resendIn = ref(0)
let resendTimer: ReturnType<typeof setInterval> | null = null

// 粘贴动态码时常带空格/换行：统一剔除并截到 64 位
const code = computed({
  get: () => rawCode.value,
  set: (value: string) => { rawCode.value = value.replace(/\s+/g, '').slice(0, 64) }
})

const emailValid = computed(() => EMAIL_RE.test(email.value.trim()))
const codeValid = computed(() => code.value.length === 64)
const appCodeValid = computed(() => /^\d{6}$/.test(appCode.value))

// 默认落在第一个开启的方式上
const panel = ref<Panel>(methods.value.email ? 'email' : methods.value.app ? 'app' : 'passkey')

const PANEL_COPY: Record<Panel, { titleKey: string, subtitleKey: string }> = {
  email: { titleKey: 'auth.signIn', subtitleKey: 'auth.email.subtitle' },
  code: { titleKey: 'auth.code.title', subtitleKey: 'auth.code.subtitle' },
  app: { titleKey: 'method.app.label', subtitleKey: 'auth.app.subtitle' },
  passkey: { titleKey: 'method.passkey.label', subtitleKey: 'auth.passkey.subtitle' }
}

const panelTitle = computed(() => t(PANEL_COPY[panel.value].titleKey))
const panelSubtitle = computed(() => t(PANEL_COPY[panel.value].subtitleKey))

// 邮件码与验证码面板属于同一种方式
const currentMethod = computed<AdminAuthMethodKey>(() => (panel.value === 'code' ? 'email' : panel.value))
const otherMethods = computed(() => ADMIN_AUTH_METHODS.filter(method =>
  method.key !== currentMethod.value && methods.value[method.key]))

function safeRedirect(): string {
  const target = String(route.query.redirect ?? '')
  return target.startsWith('/dashboard') ? target : '/dashboard'
}

function startCountdown(seconds: number) {
  if (resendTimer) clearInterval(resendTimer)
  resendIn.value = Math.max(0, Math.ceil(seconds))
  resendTimer = setInterval(() => {
    resendIn.value = Math.max(0, resendIn.value - 1)
    if (resendIn.value === 0 && resendTimer) clearInterval(resendTimer)
  }, 1000)
}

onBeforeUnmount(() => { if (resendTimer) clearInterval(resendTimer) })

function switchTo(key: AdminAuthMethodKey) {
  error.value = ''
  panel.value = key === 'email' ? (code.value ? 'code' : 'email') : key
}

function backToEmail() {
  panel.value = 'email'
  rawCode.value = ''
  error.value = ''
  resendIn.value = 0
  if (resendTimer) clearInterval(resendTimer)
}

// 第一步（发码）：后端只在邮箱属于管理员时才发信，界面一律进入验证码步骤
async function submitEmail() {
  if (submitting.value || !emailValid.value) return
  submitting.value = true
  error.value = ''
  fieldError.value = ''
  const address = email.value.trim().toLowerCase()
  try {
    const res = await $fetch<{ resendAfterSeconds: number }>('/api/dashboard/auth/email/send-code', {
      method: 'POST',
      body: { email: address }
    })
    email.value = address
    rawCode.value = ''
    panel.value = 'code'
    startCountdown(res.resendAfterSeconds)
    await nextTick()
    document.querySelector<HTMLInputElement>('.console-otp input')?.focus()
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string, data?: { data?: { retryAfterSeconds?: number, field?: string } } }
    const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
    if (retry > 0) startCountdown(retry)
    if (e.data?.data?.field === 'email') {
      fieldError.value = t('auth.error.invalidEmail')
    }
    error.value = sendErrorMessage(e.statusCode, retry)
  } finally {
    submitting.value = false
  }
}

function submitCode() {
  if (!codeValid.value) return
  return submit('/api/dashboard/auth/email/verify-code',
    { email: email.value.trim().toLowerCase(), code: code.value }, 'auth.error.incorrectCode')
}

function submitAppCode() {
  if (submitting.value || !appCodeValid.value || !emailValid.value) return
  submit('/api/dashboard/auth/app/verify', { email: email.value.trim().toLowerCase(), code: appCode.value },
    'auth.error.incorrectAppCode')
}

// Passkey 登录：不指定账号，浏览器弹出本机已绑定的通行密钥
async function submitPasskey() {
  if (passkeyBusy.value) return
  passkeyBusy.value = true
  error.value = ''
  try {
    const { startAuthentication } = await import('@simplewebauthn/browser')
    const { options, challengeId } = await $fetch<{
      options: Parameters<typeof startAuthentication>[0]['optionsJSON']
      challengeId: string
    }>('/api/dashboard/auth/passkey/options', { method: 'POST' })
    let response
    try {
      response = await startAuthentication({ optionsJSON: options })
    } catch {
      // 设备侧取消/不支持属于操作提示，用 Toast 而不是表单错误
      toast.add({
        severity: 'info',
        summary: t('toast.passkeyLoginCancelled'),
        detail: t('toast.passkeyLoginCancelledDetail'),
        life: 5000
      })
      return
    }
    const res = await $fetch<{ admin: AdminUser }>('/api/dashboard/auth/passkey/verify', {
      method: 'POST',
      body: { challengeId, response }
    })
    user.value = res.admin
    await navigateTo(safeRedirect())
  } catch (err) {
    const e = err as { statusCode?: number }
    error.value = t(e.statusCode === 403 ? 'auth.error.methodOff' : 'auth.error.passkeyFailed')
  } finally {
    passkeyBusy.value = false
  }
}

// 邮箱码 / AuthApp 共用的登录提交（fallbackKey 为错误文案的 i18n 键）
async function submit(url: string, body: Record<string, unknown>, fallbackKey: string) {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{ admin: AdminUser }>(url, { method: 'POST', body })
    user.value = res.admin
    await navigateTo(safeRedirect())
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string, data?: { data?: { retryAfterSeconds?: number } } }
    const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
    if (retry > 0) startCountdown(retry)
    if (e.statusCode === 410) {
      error.value = 'Too many incorrect codes. Please request a new one.'
    } else if (e.statusCode === 400 && fallbackMessage) {
      error.value = t(fallbackKey)
    } else {
      error.value = sendErrorMessage(e.statusCode, retry)
    }
  } finally {
    submitting.value = false
  }
}

function sendErrorMessage(status?: number, retrySeconds = 0): string {
  if (status === 423) {
    const mins = Math.ceil(retrySeconds / 60)
    return mins > 0 ? t('auth.error.lockedMin', { minutes: mins }) : t('auth.error.locked')
  }
  if (status === 429) {
    if (retrySeconds >= 60) return t('common.tooManyInMin', { minutes: Math.ceil(retrySeconds / 60) })
    if (retrySeconds > 0) return t('auth.error.retryInSec', { seconds: retrySeconds })
    return t('common.tooMany')
  }
  if (status === 502) return t('auth.error.sendFailed')
  if (status === 403) return t('auth.error.methodOff')
  if (status === 400) return t('auth.error.incorrectCode')
  return t('auth.error.generic')
}

useHead({
  title: () => t('title.signIn'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style lang="scss" scoped>
.console-auth {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 3rem 1rem;
  background: var(--dash-bg);
}

.auth-card {
  width: min(34rem, 100%);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
  border: 1px solid var(--dash-border);
  border-radius: 18px;
  background: var(--dash-card);
}

.auth-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.auth-head-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auth-brand {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--p-text-color);
  font-size: 1.2rem;
  font-weight: 700;
  text-decoration: none;
}

.brand-product {
  font-family: 'Dancing Script';
  font-weight: 600;
}

.auth-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.auth-subtitle {
  margin: -0.75rem 0 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.auth-hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
  word-break: break-word;

  code {
    font-size: 0.78rem;
  }
}

/* 64 位动态码格子样式由 app/components/ConsoleOtpInput.vue 提供 */

.auth-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0 -0.55rem;
}

.auth-alternatives {
  padding-top: 1.1rem;
  border-top: 1px solid var(--dash-border);
}

.auth-alternatives-label {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.auth-alternatives-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;

  :deep(.p-button) {
    width: 2.4rem;
    height: 2.4rem;
    padding: 0;
  }

  :deep(svg) {
    width: 1.05rem;
    height: 1.05rem;
  }
}

.auth-error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-red-500);
}

.auth-foot {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}
</style>
