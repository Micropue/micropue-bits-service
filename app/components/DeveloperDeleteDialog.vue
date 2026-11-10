<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :header="title" :style="{ width: '30rem' }">
    <div class="delete-dialog">
      <p class="delete-message">{{ message }}</p>
      <InputText id="developer-delete-phrase" v-model="phrase" autocomplete="off" fluid
        :placeholder="`Type ${DEVELOPER_DELETE_PHRASE} to confirm`" aria-label="Confirmation phrase"
        @keyup.enter="submit" />
    </div>
    <template #footer>
      <Button :label="cancelLabel" severity="secondary" text @click="visible = false" />
      <Button :label="confirmLabel" severity="danger" :disabled="!valid" :loading="loading" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DEVELOPER_DELETE_PHRASE, isDeveloperDeletePhrase } from '#shared/utils/developer'

const visible = defineModel<boolean>({ default: false })
const props = withDefaults(defineProps<{
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}>(), {
  title: 'Delete',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  loading: false
})
const emit = defineEmits<{ confirm: [phrase: string] }>()

const phrase = ref('')
const valid = computed(() => isDeveloperDeletePhrase(phrase.value))

watch(visible, open => {
  if (open) phrase.value = ''
})

function submit() {
  if (!valid.value || props.loading) return
  emit('confirm', phrase.value)
}
</script>

<style scoped lang="scss">
.delete-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.delete-message {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}
</style>
