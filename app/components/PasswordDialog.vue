<template>
  <Dialog v-model:visible="visible" modal :draggable="false"
    :header="hasPassword ? 'Change password' : 'Set password'" :style="{ width: '26rem' }">
    <!-- 步骤 1：身份认证 -->
    <div v-if="phase === 'verify'" class="dialog-form">
      <VerifyIdentity @verified="phase = 'form'" />
    </div>

    <!-- 步骤 2：设置新密码 -->
    <div v-else class="dialog-form">
      <InputText v-model="newPassword" type="password" :class="{ 'p-invalid': !!error }" autocomplete="new-password"
        placeholder="New password" aria-label="New password" />
      <InputText v-model="confirmPassword" type="password" :class="{ 'p-invalid': !!error }"
        autocomplete="new-password" placeholder="Confirm new password" aria-label="Confirm new password"
        @keyup.enter="save" />
      <small class="dialog-hint">6-20 characters, at least one letter and one number (letters, numbers, _ or -)</small>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button v-if="phase === 'form'" label="Save" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ default: false })
const { user, refresh } = useAuthUser()

const hasPassword = computed(() => user.value?.hasPassword ?? false)
const twoFactorEnabled = computed(() => user.value?.twoFactorEnabled ?? false)

const phase = ref<'verify' | 'form'>('form')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const saving = ref(false)

watch(visible, open => {
  if (!open) return
  // 已有密码 / 已开启两步验证：先认证；首次设置密码无需认证
  phase.value = hasPassword.value || twoFactorEnabled.value ? 'verify' : 'form'
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = ''
})

async function save() {
  if (saving.value) return
  if (!isValidPassword(newPassword.value)) {
    error.value = 'Password must be 6-20 characters with at least one letter and one number.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }

  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/password', {
      method: 'PATCH',
      body: { newPassword: newPassword.value }
    })
    await refresh()
    visible.value = false
  } catch (err) {
    const e = err as { statusCode?: number; data?: { data?: { retryAfterSeconds?: number } } }
    const status = e.statusCode
    if (status === 401) {
      error.value = 'Your session has expired. Please sign in again.'
    } else if (status === 403) {
      error.value = 'Incorrect current password.'
    } else if (status === 429) {
      const mins = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0) / 60)
      error.value =
        mins > 0 ? `You can change your password again in ${mins} min.` : 'Password can only be changed once per hour.'
    } else if (status === 400) {
      error.value = 'Password must be 6-20 characters with at least one letter and one number.'
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    saving.value = false
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
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
}

.dialog-error {
  color: var(--p-red-500);
  font-size: 0.85rem;
}
</style>
