<template>
  <div class="vi">
    <Transition name="vi-collapse" @leave="onLeave" @after-leave="onAfterLeave">
      <div v-if="!verified" class="vi-body">
        <!-- 未开启两步验证：使用密码 -->
        <template v-if="!twoFactorEnabled">
          <template v-if="hasPassword">
            <p class="vi-hint">Enter your password to continue.</p>
            <InputText v-model="password" type="password" :class="{ 'p-invalid': !!error }"
              autocomplete="current-password" placeholder="Current password" aria-label="Current password"
              :disabled="verified" @keyup.enter="passwordVerify" />
            <small v-if="error" class="vi-error" role="alert">{{ error }}</small>
            <Button label="Verify" :disabled="verified || !password" :loading="busy" @click="passwordVerify" />
          </template>
          <p v-else class="vi-hint">Set a password first before continuing.</p>
        </template>

        <!-- 已开启两步验证：AuthApp / Passkey / 恢复码 -->
        <template v-else>
          <p class="vi-hint">Confirm your identity with two-step verification.</p>

          <template v-if="!showRecovery">
            <div v-if="appEnabled" class="vi-otp">
              <InputOtp v-model="code" :length="6" integer-only :disabled="verified" />
            </div>
          </template>
          <template v-else>
            <InputText v-model="recoveryCode" placeholder="Recovery code" aria-label="Recovery code" :disabled="verified" />
          </template>

          <small v-if="error" class="vi-error" role="alert">{{ error }}</small>

          <Button v-if="!showRecovery && appEnabled" label="Verify" :disabled="verified || code.length !== 6"
            :loading="busy" @click="appVerify" />
          <Button v-if="!showRecovery && passkeyEnabled" label="Use a passkey" severity="secondary" outlined
            :disabled="verified" :loading="busy" @click="passkeyVerify" />
          <Button v-if="showRecovery" label="Verify" :disabled="verified || !recoveryCode" :loading="busy"
            @click="recoveryVerify" />
          <Button v-if="recoveryEnabled" variant="text" severity="secondary" size="small" :disabled="verified"
            :label="showRecovery ? 'Use an app code' : 'Use a recovery code'" @click="toggleRecovery" />
        </template>
      </div>
    </Transition>

    <Transition name="vi-fade">
      <span v-if="verified" class="vi-ok">
        <CheckCircle aria-hidden="true" />
        Verified
      </span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import CheckCircle from '@primeicons/vue/check-circle'

// 敏感操作身份认证闸门（大组件）：
// - 未开启两步验证 → 输入当前密码（POST /api/auth/verify/password）
// - 已开启两步验证 → AuthApp 动态码 / Passkey / 恢复码
// 通过后服务端发放短期授权标记，随后敏感接口即可免密码执行
const emit = defineEmits<{ verified: [] }>()

const { user } = useAuthUser()
const twoFactorEnabled = computed(() => user.value?.twoFactorEnabled ?? false)
const hasPassword = computed(() => user.value?.hasPassword ?? false)
const appEnabled = computed(() => user.value?.totpEnabled ?? false)
const passkeyEnabled = computed(() => (user.value?.passkeyCount ?? 0) > 0)
const recoveryEnabled = computed(() => (user.value?.recoveryCodesLeft ?? 0) > 0)

const password = ref('')
const code = ref('')
const recoveryCode = ref('')
const showRecovery = ref(false)
const error = ref('')
const busy = ref(false)
const verified = ref(false)

// 打开时清除上一次残留的授权标记
onMounted(() => {
  $fetch('/api/auth/verify', { method: 'DELETE' }).catch(() => {})
})

function done() {
  verified.value = true
  emit('verified')
}

function toggleRecovery() {
  showRecovery.value = !showRecovery.value
  error.value = ''
}

// 认证通过后整体坍缩：把当前高度固定，再过渡到 0（避免逐元素消失）
function onLeave(el: Element) {
  const e = el as HTMLElement
  e.style.height = `${e.scrollHeight}px`
  e.style.overflow = 'hidden'
  void e.offsetHeight
  e.style.height = '0px'
  e.style.opacity = '0'
}

function onAfterLeave(el: Element) {
  const e = el as HTMLElement
  e.style.height = ''
  e.style.overflow = ''
  e.style.opacity = ''
}

function handleError(err: unknown, recovery = false) {
  const e = err as { statusCode?: number; data?: { data?: { code?: string } } }
  if (e.data?.data?.code === 'NO_PASSWORD') {
    error.value = 'Please set a password first.'
    return
  }
  if (e.statusCode === 403) {
    error.value = recovery ? 'Invalid recovery code.' : twoFactorEnabled.value ? 'Incorrect code.' : 'Incorrect password.'
  } else if (e.statusCode === 410) {
    error.value = 'Verification expired. Please try again.'
  } else if (e.statusCode === 400) {
    error.value = 'Verification is not available.'
  } else {
    error.value = 'Verification failed. Please try again.'
  }
}

async function passwordVerify() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/verify/password', { method: 'POST', body: { password: password.value } })
    done()
  } catch (err) {
    handleError(err)
  } finally {
    busy.value = false
  }
}

async function appVerify() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/verify/app', { method: 'POST', body: { code: code.value } })
    done()
  } catch (err) {
    handleError(err)
  } finally {
    busy.value = false
  }
}

async function recoveryVerify() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/verify/recovery', { method: 'POST', body: { code: recoveryCode.value } })
    done()
  } catch (err) {
    handleError(err, true)
  } finally {
    busy.value = false
  }
}

async function passkeyVerify() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const { startAuthentication, browserSupportsWebAuthn } = await import('@simplewebauthn/browser')
    if (!browserSupportsWebAuthn()) {
      error.value = 'Passkeys are not supported on this device.'
      return
    }
    const { options, challengeId } = await $fetch<{
      options: Parameters<typeof startAuthentication>[0]
      challengeId: string
    }>('/api/auth/verify/passkey/options', { method: 'POST' })
    let assertion
    try {
      assertion = await startAuthentication({ optionsJSON: options })
    } catch {
      error.value = 'Passkey verification was cancelled.'
      return
    }
    await $fetch('/api/auth/verify/passkey/verify', {
      method: 'POST',
      body: { challengeId, response: assertion }
    })
    done()
  } catch (err) {
    handleError(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped lang="scss">
.vi {
  display: flex;
  flex-direction: column;
}

.vi-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 认证通过后整体高度坍缩到 0，并淡出 */
.vi-collapse-leave-active {
  transition: height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.vi-fade-enter-active {
  transition: opacity 0.3s ease;
}

.vi-fade-enter-from {
  opacity: 0;
}

.vi-hint {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
}

.vi-otp {
  display: flex;
  justify-content: center;
}

.vi-ok {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--p-green-600);
  font-size: 0.92rem;
  font-weight: 500;

  svg {
    width: 1.1em;
    height: 1.1em;
  }
}

.vi-error {
  color: var(--p-red-500);
  font-size: 0.85rem;
}
</style>
