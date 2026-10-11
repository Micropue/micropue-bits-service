<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :header="step === 'confirm' ? 'Confirm username' : 'Set username'"
    :style="{ width: '26rem' }">
    <div class="dialog-form">
      <template v-if="step === 'input'">
        <InputText v-model="input" :class="{ 'p-invalid': !!error }" maxlength="20" placeholder="Username"
          aria-label="Username" @keyup.enter="onSave" />
        <small class="dialog-hint">2-20 characters, letters, numbers, _ or -. This cannot be changed once set.</small>
      </template>

      <template v-else>
        <div class="warn-box">
          <ExclamationTriangle class="warn-icon" aria-hidden="true" />
          <div>
            <p class="warn-title">This cannot be undone</p>
            <p class="warn-text">
              Your username will be set to <strong>{{ input.trim() }}</strong> and cannot be changed later.
            </p>
          </div>
        </div>
      </template>

      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>
    <template #footer>
      <template v-if="step === 'input'">
        <Button label="Cancel" severity="secondary" text @click="visible = false" />
        <Button label="Save" @click="onSave" />
      </template>
      <template v-else>
        <Button label="Back" severity="secondary" text :disabled="saving" @click="step = 'input'" />
        <Button label="Confirm & save" severity="danger" :loading="saving" @click="confirm" />
      </template>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'

const visible = defineModel<boolean>({ default: false })
const { refresh } = useAuthUser()

const step = ref<'input' | 'confirm'>('input')
const input = ref('')
const error = ref('')
const saving = ref(false)

watch(visible, open => {
  if (open) {
    step.value = 'input'
    input.value = ''
    error.value = ''
  }
})

// 第一步：校验输入，通过后进入不可撤销确认
function onSave() {
  const value = input.value.trim()
  if (!isValidUsername(value)) {
    error.value = 'Username must be 2-20 characters (letters, numbers, _ or -).'
    return
  }
  input.value = value
  error.value = ''
  step.value = 'confirm'
}

// 第二步：确认后提交
async function confirm() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/profile', { method: 'PATCH', body: { username: input.value } })
    await refresh()
    visible.value = false
  } catch (err) {
    const e = err as { statusCode?: number }
    if (e.statusCode === 401) error.value = 'Your session has expired. Please sign in again.'
    else if (e.statusCode === 409) error.value = 'That username is already taken.'
    else if (e.statusCode === 403) error.value = 'Username has already been set and cannot be changed.'
    else if (e.statusCode === 400) error.value = 'Username must be 2-20 characters (letters, numbers, _ or -).'
    else error.value = 'Something went wrong. Please try again.'
    step.value = 'input'
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

.warn-box {
  display: flex;
  gap: 0.7rem;
  padding: 0.8rem 0.9rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--p-orange-500) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--p-orange-500) 35%, transparent);
}

.warn-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: var(--p-orange-500);
}

.warn-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.warn-text {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}
</style>
