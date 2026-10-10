<template>
  <Dialog v-model:visible="visible" modal :draggable="false" header="Set username" :style="{ width: '26rem' }">
    <div class="dialog-form">
      <InputText v-model="input" :class="{ 'p-invalid': !!error }" maxlength="20" placeholder="Username"
        aria-label="Username" @keyup.enter="save" />
      <small class="dialog-hint">2-20 characters, letters, numbers, _ or -. This cannot be changed once set.</small>
      <small v-if="error" class="dialog-error" role="alert">{{ error }}</small>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button label="Save" :loading="saving" @click="save" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>({ default: false })
const { refresh } = useAuthUser()

const input = ref('')
const error = ref('')
const saving = ref(false)

watch(visible, open => {
  if (open) {
    input.value = ''
    error.value = ''
  }
})

async function save() {
  if (saving.value) return
  const value = input.value.trim()
  if (!isValidUsername(value)) {
    error.value = 'Username must be 2-20 characters (letters, numbers, _ or -).'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/profile', { method: 'PATCH', body: { username: value } })
    await refresh()
    visible.value = false
  } catch (err) {
    const e = err as { statusCode?: number }
    if (e.statusCode === 401) error.value = 'Your session has expired. Please sign in again.'
    else if (e.statusCode === 409) error.value = 'That username is already taken.'
    else if (e.statusCode === 403) error.value = 'Username has already been set and cannot be changed.'
    else if (e.statusCode === 400) error.value = 'Username must be 2-20 characters (letters, numbers, _ or -).'
    else error.value = 'Something went wrong. Please try again.'
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
