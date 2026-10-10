<template>
  <Dialog v-model:visible="visible" modal :draggable="false" header="Change nickname" :style="{ width: '26rem' }">
    <div class="dialog-form">
      <InputText v-model="input" :class="{ 'p-invalid': !!error }" maxlength="20" placeholder="Nickname"
        aria-label="Nickname" @keyup.enter="save" />
      <small class="dialog-hint">2-20 characters, letters, numbers, _ or -</small>
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
const { user, refresh } = useAuthUser()

const input = ref('')
const error = ref('')
const saving = ref(false)

watch(visible, open => {
  if (open) {
    input.value = user.value?.nickname ?? ''
    error.value = ''
  }
})

async function save() {
  if (saving.value) return
  const value = input.value.trim()
  if (!isValidNickname(value)) {
    error.value = 'Nickname must be 2-20 characters (letters, numbers, _ or -).'
    return
  }
  if (value === user.value?.nickname) {
    visible.value = false
    return
  }
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/profile', { method: 'PATCH', body: { nickname: value } })
    await refresh()
    visible.value = false
  } catch (err) {
    const e = err as { statusCode?: number }
    if (e.statusCode === 401) error.value = 'Your session has expired. Please sign in again.'
    else if (e.statusCode === 400) error.value = 'Nickname must be 2-20 characters (letters, numbers, _ or -).'
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
