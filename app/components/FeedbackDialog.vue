<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :style="{ width: '30rem' }" header="Send feedback">
    <div class="dialog-form">
      <p class="dialog-note">Tell the author what is wrong with “{{ snippetName }}”.</p>
      <label class="field" for="feedback-type">
        <span>Type</span>
        <Select id="feedback-type" v-model="type" :options="FEEDBACK_TYPES" option-label="label"
          option-value="value" :allow-empty="false" fluid />
      </label>
      <label class="field" for="feedback-detail">
        <span>Details</span>
        <Textarea id="feedback-detail" v-model="detail" rows="4" maxlength="500" auto-resize fluid
          placeholder="What should the author know?" />
      </label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button label="Send feedback" :loading="saving" :disabled="detail.trim().length < 2 || saving" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { FEEDBACK_TYPES } from '#shared/utils/moderation'

const props = defineProps<{
  username: string
  slug: string
  snippetName: string
}>()
const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ submitted: [] }>()
const toast = useToast()

const type = ref('broken')
const detail = ref('')
const saving = ref(false)
const error = ref('')

watch(visible, open => {
  if (!open) return
  type.value = 'broken'
  detail.value = ''
  error.value = ''
})

async function submit() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: { username: props.username, slug: props.slug, type: type.value, detail: detail.value.trim() }
    })
    visible.value = false
    emit('submitted')
    toast.add({ severity: 'success', summary: 'Feedback sent', life: 3000 })
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    error.value = e.statusMessage ?? 'Could not send feedback'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialog-note {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-red-500, #ef4444);
}
</style>
