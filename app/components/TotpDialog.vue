<template>
  <Dialog v-model:visible="visible" modal :draggable="false" header="Authenticator App" :style="{ width: '30rem' }">
    <!-- 已绑定：管理（解绑） -->
    <div v-if="isSetup" class="dialog-form">
      <p class="totp-ok">Authenticator app is set up.</p>
      <p class="dialog-hint">Your account can use time-based codes for two-step authentication.</p>
      <InputText v-model="password" type="password" :class="{ 'p-invalid': !!error }" autocomplete="current-password"
        placeholder="Current password" aria-label="Current password" @keyup.enter="remove" />
      <small class="dialog-hint">Confirm your password to remove the authenticator app.</small>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <!-- 设置第 1 步：密码确认 -->
    <div v-else-if="phase === 'password'" class="dialog-form">
      <p class="dialog-hint">
        You'll scan a QR code with an authenticator app (Microsoft Authenticator, Google Authenticator, etc.).
      </p>
      <InputText v-model="password" type="password" :class="{ 'p-invalid': !!error }" autocomplete="current-password"
        placeholder="Current password" aria-label="Current password" @keyup.enter="startSetup" />
      <small class="dialog-hint">Confirm your password to continue.</small>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <!-- 设置第 2 步：扫码 + 校验 -->
    <div v-else class="dialog-form totp-scan">
      <p class="dialog-hint">Scan this QR code with your authenticator app.</p>
      <img v-if="qrDataUrl" class="totp-qr" :src="qrDataUrl" alt="Authenticator QR code" />
      <p class="dialog-hint">Or enter this key manually:</p>
      <code class="totp-key">{{ manualKeyText }}</code>
      <p class="dialog-hint">Then enter the 6-digit code shown in the app.</p>
      <div class="totp-otp">
        <InputOtp v-model="code" :length="6" integer-only />
      </div>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button v-if="isSetup" label="Remove" severity="danger" :loading="busy" @click="remove" />
      <Button v-else-if="phase === 'password'" label="Continue" :loading="busy" @click="startSetup" />
      <Button v-else label="Verify & enable" :disabled="code.length !== 6" :loading="busy" @click="activate" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ default: false })
const { user, refresh } = useAuthUser()

const isSetup = computed(() => user.value?.totpEnabled ?? false)

const phase = ref<'password' | 'scan'>('password')
const password = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)
const qrDataUrl = ref('')
const manualKey = ref('')

const manualKeyText = computed(() => manualKey.value.replace(/(.{4})/g, '$1 ').trim())

watch(visible, open => {
  if (!open) return
  phase.value = 'password'
  password.value = ''
  code.value = ''
  error.value = ''
  qrDataUrl.value = ''
  manualKey.value = ''
})

async function startSetup() {
  if (busy.value) return
  if (!password.value) {
    error.value = 'Please enter your current password.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ secret: string; qrDataUrl: string }>('/api/auth/totp/setup', {
      method: 'POST',
      body: { password: password.value }
    })
    manualKey.value = res.secret
    qrDataUrl.value = res.qrDataUrl
    code.value = ''
    phase.value = 'scan'
  } catch (err) {
    const e = err as { statusCode?: number; data?: { data?: { code?: string } } }
    if (e.statusCode === 403) error.value = 'Incorrect password.'
    else if (e.statusCode === 409 || e.data?.data?.code === 'NO_PASSWORD')
      error.value = e.data?.data?.code === 'NO_PASSWORD' ? 'Please set a password first.' : 'Authenticator app is already set up.'
    else if (e.statusCode === 400) error.value = 'Please set a password first.'
    else error.value = 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}

async function activate() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/totp/activate', { method: 'POST', body: { code: code.value } })
    await refresh()
    visible.value = false
  } catch (err) {
    const e = err as { statusCode?: number }
    if (e.statusCode === 410) {
      error.value = 'Setup session expired. Please start again.'
      phase.value = 'password'
    } else if (e.statusCode === 400) {
      error.value = 'Incorrect code. Check the app and try again.'
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (busy.value) return
  if (!password.value) {
    error.value = 'Please enter your current password.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/totp/disable', { method: 'POST', body: { password: password.value } })
    await refresh()
    visible.value = false
  } catch (err) {
    const e = err as { statusCode?: number }
    if (e.statusCode === 403) error.value = 'Incorrect password.'
    else error.value = 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.25rem;
}

.dialog-hint {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
}

.dialog-error {
  color: var(--p-red-500);
  font-size: 0.85rem;
}

.totp-ok {
  margin: 0;
  color: var(--p-green-600);
  font-size: 0.95rem;
  font-weight: 500;
}

.totp-scan {
  align-items: center;
  text-align: center;
}

.totp-qr {
  width: 200px;
  height: 200px;
  border-radius: 10px;
  background: #fff;
  padding: 0.5rem;
}

.totp-key {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  word-break: break-all;
}

.totp-otp {
  display: flex;
  justify-content: center;
}
</style>
