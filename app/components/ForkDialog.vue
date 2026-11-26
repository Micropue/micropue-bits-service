<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :style="{ width: '32rem' }" :header="title">
    <div class="fork-dialog">
      <div class="source">
        <span class="source-label">Forking</span>
        <strong>{{ sourceName }}</strong>
        <span class="source-path">@{{ sourceUsername }}/{{ sourceSlug }}</span>
      </div>

      <label class="field" for="fork-slug">
        <span>URL name</span>
        <div class="slug-input">
          <span class="slug-prefix" aria-hidden="true">/{{ destinationUsername }}/</span>
          <InputText id="fork-slug" v-model="slug" maxlength="40" autocomplete="off" fluid
            placeholder="auto-generated-from-name" @blur="checkSlug" @keydown.enter.prevent="submit" />
        </div>
        <small class="hint">Lowercase letters, numbers and hyphens. Leave blank to generate one automatically.</small>
        <small v-if="slugError" class="error" role="alert">{{ slugError }}</small>
        <small v-else-if="slugConflict" class="error" role="alert">This URL is already used by another item.</small>
        <small v-else class="hint">The fork will be created at <code>/{{ destinationUsername }}/{{ slug || '…' }}</code>.</small>
      </label>

      <div class="field">
        <span>Visibility</span>
        <SelectButton v-model="visibility" :options="VISIBILITY_OPTIONS" option-label="label" option-value="value"
          :allow-empty="false" aria-label="Visibility" />
        <small class="hint">{{ visibilityHint }}</small>
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text :disabled="saving" @click="visible = false" />
      <Button label="Create fork" :loading="saving" :disabled="!canSubmit || saving" @click="submit" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
// Fork 确认弹窗：先确认、再自定义 URL 与可见性；不会在点击 Fork 时直接创建副本
defineOptions({ name: 'ForkDialog' })

const props = defineProps<{
  kind: 'snippet' | 'group'
  sourceUsername: string
  sourceSlug: string
  sourceName: string
}>()

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ forked: [{ slug: string }] }>()
const { user } = useAuthUser()

const VISIBILITY_OPTIONS = [
  { label: 'Private', value: 'private' },
  { label: 'Unlisted', value: 'unlisted' },
  { label: 'Public', value: 'public' }
]

const title = computed(() => props.kind === 'group' ? 'Fork group' : 'Fork snippet')
const destinationUsername = computed(() => user.value?.username ?? user.value?.email ?? 'you')
const slug = ref('')
const visibility = ref<'public' | 'unlisted' | 'private'>('private')
const saving = ref(false)
const error = ref('')
const slugConflict = ref(false)
let checkSeq = 0

const slugValid = computed(() => !slug.value.trim() || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value.trim()))
const slugError = computed(() => slugValid.value ? '' : 'Use lowercase letters, numbers and single hyphens only.')
const canSubmit = computed(() => slugValid.value && !slugConflict.value)
const visibilityHint = computed(() => ({
  private: 'Only you can open the fork.',
  unlisted: 'Anyone with the link can open it, but it stays out of search.',
  public: 'Visible in your profile, the catalog and search.'
})[visibility.value])

watch(visible, open => {
  if (!open) return
  slug.value = ''
  visibility.value = 'private'
  saving.value = false
  error.value = ''
  slugConflict.value = false
})

watch(slug, () => {
  slugConflict.value = false
  error.value = ''
})

async function checkSlug() {
  const value = slug.value.trim()
  if (!value || !slugValid.value) {
    slugConflict.value = false
    return
  }
  const seq = ++checkSeq
  try {
    const result = await $fetch<{ available: boolean }>('/api/profile/name-availability', {
      query: { kind: props.kind, name: props.sourceName, slug: value }
    })
    if (seq === checkSeq) slugConflict.value = !result.available
  } catch {
    if (seq === checkSeq) slugConflict.value = false
  }
}

async function submit() {
  if (!canSubmit.value || saving.value) return
  await checkSlug()
  if (slugConflict.value) return
  saving.value = true
  error.value = ''
  try {
    const body = {
      slug: slug.value.trim() || undefined,
      visibility: visibility.value
    }
    const endpoint = props.kind === 'group'
      ? `/api/groups/${encodeURIComponent(props.sourceUsername)}/${encodeURIComponent(props.sourceSlug)}/fork`
      : `/api/snippets/${encodeURIComponent(props.sourceUsername)}/${encodeURIComponent(props.sourceSlug)}/fork`
    const response = await $fetch<{ snippet?: { slug: string }, group?: { slug: string } }>(endpoint, {
      method: 'POST',
      body
    })
    const createdSlug = response.snippet?.slug ?? response.group?.slug
    if (!createdSlug) throw new Error('Fork response did not include a URL')
    visible.value = false
    emit('forked', { slug: createdSlug })
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    if (e.statusCode === 401) {
      await navigateTo('/sign')
      return
    }
    if (e.statusCode === 409) slugConflict.value = true
    error.value = e.statusMessage ?? 'Fork failed'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.fork-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.source {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.7rem;
  background: color-mix(in srgb, var(--p-text-color) 3%, transparent);
}

.source-label {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.source-path {
  font-family: var(--font-code);
  font-size: 0.78rem;
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

.slug-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--p-inputtext-border-color);
  border-radius: var(--p-inputtext-border-radius);
  background: var(--p-inputtext-background);
  overflow: hidden;
}

.slug-input:focus-within {
  border-color: var(--p-inputtext-focus-border-color);
  box-shadow: var(--p-inputtext-focus-ring-shadow);
}

.slug-input :deep(.p-inputtext) {
  border: 0;
  box-shadow: none;
}

.slug-prefix {
  flex: none;
  padding-left: 0.75rem;
  font-family: var(--font-code);
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.hint,
.error {
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1.5;
}

.hint {
  color: var(--p-text-muted-color);
}

.hint code {
  font-family: var(--font-code);
}

.error {
  margin: 0;
  color: var(--p-red-500, #ef4444);
}
</style>
