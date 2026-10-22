<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :style="{ width: '30rem' }"
    :header="`Report ${targetKind}`">
    <div class="dialog-form">
      <p class="dialog-note">Report “{{ targetName }}” to the site administrators.</p>
      <label class="field" for="report-type">
        <span>Reason</span>
        <Select id="report-type" v-model="type" :options="typeOptions" option-label="label"
          option-value="value" :allow-empty="false" fluid />
      </label>
      <label class="field" for="report-detail">
        <span>Details</span>
        <Textarea id="report-detail" v-model="detail" rows="4" maxlength="500" auto-resize fluid
          placeholder="What should the administrators know?" />
      </label>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button label="Submit report" :loading="saving" :disabled="detail.trim().length < 2 || saving" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { REPORT_TYPES, type ReportTargetKind } from '#shared/utils/moderation'

const props = defineProps<{
  targetKind: ReportTargetKind
  username: string
  slug?: string
  targetName: string
}>()
const visible = defineModel<boolean>('visible', { default: false })
const toast = useToast()

const typeOptions = computed(() => REPORT_TYPES[props.targetKind])
const type = ref(typeOptions.value[0]?.value ?? 'other')
const detail = ref('')
const saving = ref(false)
const error = ref('')

watch(visible, open => {
  if (!open) return
  type.value = typeOptions.value[0]?.value ?? 'other'
  detail.value = ''
  error.value = ''
})
watch(() => props.targetKind, () => {
  type.value = typeOptions.value[0]?.value ?? 'other'
})

async function submit() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: {
        targetKind: props.targetKind,
        username: props.username,
        slug: props.slug,
        type: type.value,
        detail: detail.value.trim()
      }
    })
    visible.value = false
    toast.add({ severity: 'success', summary: 'Report submitted', life: 3000 })
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    error.value = e.statusMessage ?? 'Could not submit report'
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
