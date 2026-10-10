<template>
  <Dialog v-model:visible="visible" modal :draggable="false" header="Two-step authentication" :style="{ width: '32rem' }">
    <!-- 主界面 -->
    <div v-if="phase === 'main'" class="tf">
      <p class="dialog-hint">
        Add a second verification step when signing in with an email code or GitHub. Passkey sign-in already counts as
        two steps, so it skips this.
      </p>

      <div class="tf-switch">
        <div>
          <span class="tf-switch-label">Two-step authentication</span>
          <span class="tf-switch-desc">{{ twoFactorEnabled ? 'On' : 'Off' }}</span>
        </div>
        <ToggleSwitch :model-value="twoFactorEnabled" :disabled="!twoFactorEnabled && !canEnable"
          @update:model-value="onToggle" />
      </div>

      <div class="tf-methods">
        <span class="tf-methods-title">Available methods</span>
        <div class="tf-method">
          <span>Authenticator App</span>
          <span :class="['tf-tag', totpEnabled ? 'tf-tag--ok' : 'tf-tag--off']">
            {{ totpEnabled ? 'Set up' : 'Not set up' }}
          </span>
        </div>
        <div class="tf-method">
          <span>Passkey</span>
          <span :class="['tf-tag', passkeyCount > 0 ? 'tf-tag--ok' : 'tf-tag--off']">
            {{ passkeyCount > 0 ? `${passkeyCount} bound` : 'None' }}
          </span>
        </div>
      </div>

      <p v-if="!canEnable" class="dialog-hint">Set up an authenticator app or a passkey first to enable this.</p>
      <p v-else-if="twoFactorEnabled" class="dialog-hint">
        {{ recoveryCodesLeft }} recovery code{{ recoveryCodesLeft === 1 ? '' : 's' }} remaining.
      </p>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <!-- 密码确认 -->
    <div v-else-if="phase === 'password'" class="dialog-form">
      <InputText v-model="password" type="password" :class="{ 'p-invalid': !!error }" autocomplete="current-password"
        placeholder="Current password" aria-label="Current password" @keyup.enter="confirm" />
      <small class="dialog-hint">{{ passwordHint }}</small>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <!-- 展示恢复码 -->
    <div v-else class="tf">
      <p class="tf-warn">
        Save these recovery codes now. Each works once and lets you sign in if you lose access to your other methods.
        They won't be shown again.
      </p>
      <div class="tf-codes">
        <code v-for="c in recoveryCodes" :key="c">{{ c }}</code>
      </div>
      <Button label="Copy codes" severity="secondary" outlined size="small" @click="copyCodes" />
      <small v-if="copied" class="tf-copied">Copied.</small>
    </div>

    <template #footer>
      <template v-if="phase === 'main'">
        <Button label="Close" severity="secondary" text @click="visible = false" />
        <Button v-if="twoFactorEnabled" label="Regenerate codes" severity="secondary" outlined @click="openAction('regenerate')" />
      </template>
      <template v-else-if="phase === 'password'">
        <Button label="Back" severity="secondary" text @click="phase = 'main'" />
        <Button :label="action === 'disable' ? 'Turn off' : 'Confirm'" :severity="action === 'disable' ? 'danger' : undefined"
          :loading="busy" @click="confirm" />
      </template>
      <template v-else>
        <Button label="Done" @click="visible = false" />
      </template>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ default: false })
const { user, refresh } = useAuthUser()

const twoFactorEnabled = computed(() => user.value?.twoFactorEnabled ?? false)
const totpEnabled = computed(() => user.value?.totpEnabled ?? false)
const passkeyCount = computed(() => user.value?.passkeyCount ?? 0)
const recoveryCodesLeft = computed(() => user.value?.recoveryCodesLeft ?? 0)
const canEnable = computed(() => totpEnabled.value || passkeyCount.value > 0)

type Action = 'enable' | 'disable' | 'regenerate'

const phase = ref<'main' | 'password' | 'codes'>('main')
const action = ref<Action>('enable')
const password = ref('')
const error = ref('')
const busy = ref(false)
const recoveryCodes = ref<string[]>([])
const copied = ref(false)

const passwordHint = computed(() => {
  if (action.value === 'enable') return 'Confirm your password to turn on two-step authentication.'
  if (action.value === 'disable') return 'Confirm your password to turn off two-step authentication.'
  return 'Confirm your password to generate new recovery codes.'
})

watch(visible, open => {
  if (!open) return
  phase.value = 'main'
  password.value = ''
  error.value = ''
  recoveryCodes.value = []
  copied.value = false
})

function openAction(a: Action) {
  action.value = a
  password.value = ''
  error.value = ''
  phase.value = 'password'
}

function onToggle(value: boolean) {
  if (value === twoFactorEnabled.value) return
  openAction(value ? 'enable' : 'disable')
}

async function confirm() {
  if (busy.value) return
  if (!password.value) {
    error.value = 'Please enter your current password.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    if (action.value === 'enable') {
      const res = await $fetch<{ recoveryCodes: string[] }>('/api/auth/2fa/config', {
        method: 'POST',
        body: { enabled: true, password: password.value }
      })
      recoveryCodes.value = res.recoveryCodes
      await refresh()
      phase.value = 'codes'
    } else if (action.value === 'disable') {
      await $fetch('/api/auth/2fa/config', { method: 'POST', body: { enabled: false, password: password.value } })
      await refresh()
      visible.value = false
    } else {
      const res = await $fetch<{ recoveryCodes: string[] }>('/api/auth/2fa/recovery/regenerate', {
        method: 'POST',
        body: { password: password.value }
      })
      recoveryCodes.value = res.recoveryCodes
      await refresh()
      phase.value = 'codes'
    }
  } catch (err) {
    const e = err as { statusCode?: number; data?: { data?: { code?: string } } }
    if (e.statusCode === 403) error.value = 'Incorrect password.'
    else if (e.data?.data?.code === 'NO_PASSWORD') error.value = 'Please set a password first.'
    else if (e.statusCode === 400) error.value = 'Set up an authenticator app or a passkey first.'
    else error.value = 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join('\n'))
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // 剪贴板不可用时忽略
  }
}
</script>

<style scoped lang="scss">
.tf,
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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

.tf-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
}

.tf-switch-label {
  display: block;
  font-size: 0.92rem;
  font-weight: 500;
}

.tf-switch-desc {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.tf-methods {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tf-methods-title {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.tf-method {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
}

.tf-tag {
  font-size: 0.8rem;

  &--ok {
    color: var(--p-green-600);
  }

  &--off {
    color: var(--p-text-muted-color);
  }
}

.tf-warn {
  margin: 0;
  padding: 0.6rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
  background: color-mix(in srgb, var(--p-orange-500) 12%, transparent);
  color: var(--p-orange-600);
}

.tf-codes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;

  code {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
    text-align: center;
  }
}

.tf-copied {
  color: var(--p-green-600);
  font-size: 0.82rem;
}
</style>
