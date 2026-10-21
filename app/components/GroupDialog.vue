<template>
  <Dialog v-model:visible="visible" modal :draggable="false" :style="{ width: '30rem' }"
    :header="editing ? 'Edit group' : 'New group'">
    <div class="dialog-form">
      <label class="field" for="group-name">
        <span>Name</span>
        <InputText id="group-name" v-model="name" name="name" maxlength="60" autocomplete="off" fluid />
      </label>
      <label class="field" for="group-intro">
        <span>Description <span class="optional">(optional)</span></span>
        <Textarea id="group-intro" v-model="intro" name="intro" rows="3" maxlength="500" autocomplete="off"
          auto-resize fluid />
      </label>
      <div class="field">
        <span>Visibility</span>
        <SelectButton v-model="visibility" :options="VISIBILITY_OPTIONS" option-label="label"
          option-value="value" :allow-empty="false" aria-label="Visibility" />
      </div>
      <div class="field">
        <span>Tags <span class="optional">(up to 5)</span></span>
        <div class="tag-input">
          <InputText id="group-tag" v-model="tagInput" name="group-tag" maxlength="32" autocomplete="off" fluid
            placeholder="Type a tag and press Enter" @keydown.enter.prevent="addTag" />
          <Button label="Add" size="small" severity="secondary" outlined :disabled="!canAddTag" @click="addTag" />
        </div>
        <div v-if="tags.length" class="tag-list">
          <span v-for="tag in tags" :key="tag" class="tag">
            {{ tag }}
            <button type="button" class="tag-remove" :aria-label="`Remove tag ${tag}`" @click="removeTag(tag)">×</button>
          </span>
        </div>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button :label="editing ? 'Save' : 'Create'" :loading="saving" :disabled="!name.trim() || saving"
        @click="save" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
// 分组新建 / 编辑弹窗：个人主页与分组详情页共用同一套交互
interface GroupLike {
  slug: string
  name: string
  intro: string
  visibility: string
  tags: { key: string, name: string }[]
}

defineOptions({ name: 'GroupDialog' })

const props = defineProps<{ group?: GroupLike | null }>()
const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const VISIBILITY_OPTIONS = [
  { label: 'Private', value: 'private' },
  { label: 'Unlisted', value: 'unlisted' },
  { label: 'Public', value: 'public' }
]

const editing = computed(() => !!props.group?.slug)
const name = ref('')
const intro = ref('')
const visibility = ref<'public' | 'unlisted' | 'private'>('private')
const tags = ref<string[]>([])
const tagInput = ref('')
const saving = ref(false)
const error = ref('')

watch(visible, open => {
  if (!open) return
  const group = props.group
  name.value = group?.name ?? ''
  intro.value = group?.intro ?? ''
  visibility.value = (group?.visibility as 'public' | 'unlisted' | 'private' | undefined) ?? 'private'
  tags.value = group?.tags.map(tag => tag.name) ?? []
  tagInput.value = ''
  error.value = ''
  saving.value = false
}, { immediate: true })

const canAddTag = computed(() => {
  const value = tagInput.value.trim()
  if (!value || tags.value.length >= 5) return false
  return !tags.value.some(tag => tag.toLowerCase() === value.toLowerCase())
})

function addTag() {
  if (!canAddTag.value) return
  tags.value.push(tagInput.value.trim().slice(0, 32))
  tagInput.value = ''
}

function removeTag(tag: string) {
  tags.value = tags.value.filter(item => item !== tag)
}

async function save() {
  if (saving.value || !name.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    const body = {
      name: name.value.trim(),
      intro: intro.value.trim(),
      visibility: visibility.value,
      tags: tags.value
    }
    if (editing.value) {
      await $fetch(`/api/groups/${encodeURIComponent(props.group!.slug)}`, { method: 'PATCH', body })
      toast.add({ severity: 'success', summary: 'Group updated', life: 2500 })
    } else {
      const result = await $fetch<{ group: { slug: string, deduplicated: boolean } }>('/api/groups', {
        method: 'POST',
        body
      })
      if (result.group.deduplicated) {
        toast.add({
          severity: 'warn',
          summary: 'Group created — URL name adjusted',
          detail: `A group URL based on “${name.value.trim()}” already exists, so this group uses “${result.group.slug}”. The group name is unchanged.`,
          life: 6000
        })
      } else {
        toast.add({ severity: 'success', summary: 'Group created', life: 2500 })
      }
    }
    visible.value = false
    emit('saved')
  } catch (err) {
    error.value = (err as { statusMessage?: string }).statusMessage ?? 'Save failed'
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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.optional {
  opacity: 0.7;
}

.tag-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  :deep(.p-inputtext) {
    flex: 1 1 auto;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.08rem 0.45rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}

.tag-remove {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: 1;
  opacity: 0.6;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
}

.form-error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--p-red-500, #ef4444);
}
</style>
