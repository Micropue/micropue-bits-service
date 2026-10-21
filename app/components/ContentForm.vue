<template>
  <div class="content-form">
    <div class="details">
      <div class="details-fields">
        <div class="field">
          <span class="field-label">Language</span>
          <Select v-model="language" :options="languageOptions" option-label="name" filter fluid
            placeholder="Search languages" aria-label="Language" @filter="onLanguageFilter"
            @change="onLanguageChange">
            <template #option="{ option }">
              <span class="option-row">
                <img v-if="option.logo_url" class="option-logo" :src="option.logo_url" alt="" width="18" height="18"
                  loading="lazy">
                {{ option.name }}
              </span>
            </template>
            <template #value>
              <span v-if="language" class="option-row">
                <img v-if="language.logo_url" class="option-logo" :src="language.logo_url" alt="" width="18"
                  height="18" loading="lazy">
                {{ language.name }}
              </span>
            </template>
          </Select>
          <small class="field-hint">
            Missing a language? <NuxtLink to="/request?kind=language" class="inline-link">Request a new language</NuxtLink>.
          </small>
        </div>

        <div class="field">
          <span class="field-label">Dependencies <span class="optional">(optional)</span></span>
          <MultiSelect v-model="dependencySelection" :options="dependencyGroups" option-group-label="label"
            option-group-children="items" option-label="name" filter display="chip" fluid :loading="dependenciesLoading"
            placeholder="Select dependencies" aria-label="Dependencies" @filter="onDependencyFilter">
            <template #option="{ option }">
              <span class="dep-option">
                <img v-if="option.logo_url" class="dep-logo" :src="option.logo_url" alt="" width="16" height="16"
                  loading="lazy">
                <span>{{ option.name }}</span>
              </span>
            </template>
            <template #chip="{ value, removeCallback }">
              <span class="dep-chip">
                <img v-if="value.logo_url" class="dep-logo" :src="value.logo_url" alt="" width="14" height="14"
                  loading="lazy">
                <span>{{ value.name }}</span>
                <button type="button" class="dep-remove" :aria-label="`Remove ${value.name}`"
                  @click.stop="removeCallback($event)">×</button>
              </span>
            </template>
          </MultiSelect>
          <small class="field-hint">
            Missing a package? <NuxtLink to="/request?kind=dependency" class="inline-link">Request a new dependency</NuxtLink>.
          </small>
        </div>

        <div class="field">
          <span class="field-label">Group <span class="optional">(optional)</span></span>
          <Select v-model="groupSlug" :options="groupOptions" option-label="name" option-value="slug" show-clear fluid
            placeholder="No group" aria-label="Group" />
        </div>

        <div class="field">
          <label class="field-label" for="content-name">Name</label>
          <InputText id="content-name" v-model="name" name="name" maxlength="60" autocomplete="off" fluid
            placeholder="Debounced ref" />
          <small class="field-hint">URL name: <code>{{ slugPreview }}</code></small>
        </div>

        <div class="field">
          <label class="field-label" for="content-intro">Description <span class="optional">(optional)</span></label>
          <Textarea id="content-intro" v-model="intro" name="intro" rows="3" maxlength="500" autocomplete="off"
            auto-resize fluid placeholder="What it does, when to use it…" />
        </div>

        <div class="field">
          <span class="field-label">Tags <span class="optional">(up to 5)</span></span>
          <div class="tag-input">
            <InputText id="content-tag" v-model="tagInput" name="tag" maxlength="32" autocomplete="off" fluid
              placeholder="Type a tag and press Enter" @keydown.enter.prevent="addTag" />
            <Button label="Add" size="small" severity="secondary" outlined :disabled="!canAddTag" @click="addTag" />
          </div>
          <div v-if="tags.length" class="tag-list">
            <span v-for="tag in tags" :key="tag" class="tag">
              {{ tag }}
              <button type="button" class="tag-remove" :aria-label="`Remove tag ${tag}`" @click="removeTag(tag)">×</button>
            </span>
          </div>
          <div v-if="suggestedTags.length" class="tag-suggest">
            <span class="tag-suggest-label">Suggestions:</span>
            <button v-for="tag in suggestedTags" :key="tag.tag_key" type="button" class="tag tag--ghost"
              @click="addTagValue(tag.name)">{{ tag.name }}</button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">Visibility</span>
          <SelectButton v-model="visibility" :options="VISIBILITY_OPTIONS" option-label="label" option-value="value"
            :allow-empty="false" aria-label="Visibility" />
          <small class="field-hint">{{ visibilityHint }}</small>
          <small v-if="!usernameSet" class="field-hint">
            Public and unlisted content needs a username —
            <NuxtLink to="/account/profile" class="inline-link">set one first</NuxtLink>.
          </small>
        </div>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <div class="details-actions">
          <Button :label="submitLabel" :loading="saving" :disabled="!canSubmit || saving" @click="submit" />
          <slot name="secondary-actions" />
        </div>
      </div>

      <div class="details-code">
        <span class="field-label">Code</span>
        <div class="code-card">
          <div class="code-head">
            <span class="code-lang">{{ language?.name ?? 'Code' }}</span>
            <span>{{ codeSize }}</span>
          </div>
          <CodeEditor v-model="code" :language="language?.name" :height="520" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 代码段表单（新建第 3 步 / 编辑页共用）：语言、依赖、分组、名称、介绍、标签、可见性、代码
defineOptions({ name: 'ContentForm' })

interface LanguageOption {
  slug: string
  name: string
  logo_url: string | null
}

interface DependencyOption {
  slug: string
  name: string
  kind: string
  logo_url: string | null
}

interface TagOption {
  tag_key: string
  name: string
}

export interface ContentFormInitial {
  language?: LanguageOption | null
  dependencies?: DependencyOption[]
  name?: string
  intro?: string
  tags?: string[]
  visibility?: 'public' | 'unlisted' | 'private'
  code?: string
  group?: string
}

export interface ContentFormPayload {
  name: string
  intro: string
  visibility: 'public' | 'unlisted' | 'private'
  code: string
  language: string
  dependencies: string[]
  tags: string[]
  group: string
}

const props = withDefaults(defineProps<{
  initial?: ContentFormInitial
  submitLabel?: string
  saving?: boolean
  error?: string
  /** 编辑模式下的固定 slug（不可改） */
  slug?: string
}>(), {
  initial: () => ({}),
  submitLabel: 'Save',
  saving: false,
  error: '',
  slug: ''
})

const emit = defineEmits<{ submit: [payload: ContentFormPayload] }>()

const VISIBILITY_OPTIONS = [
  { label: 'Private', value: 'private' },
  { label: 'Unlisted', value: 'unlisted' },
  { label: 'Public', value: 'public' }
]

const KIND_LABELS: Record<string, string> = {
  framework: 'Frameworks',
  library: 'Libraries',
  tool: 'Tools',
  runtime: 'Runtimes'
}

const { user: authUser } = useAuthUser()
const usernameSet = computed(() => authUser.value?.usernameSet ?? false)

// 标签建议（自由创建）
const { data: tagData } = await useFetch<{ tags: TagOption[] }>('/api/tags')
const tagOptions = computed(() => tagData.value?.tags ?? [])

// 自己的分组选项
const { data: groupData } = await useFetch<{ groups: { slug: string, name: string }[] }>('/api/account/groups')

const language = ref<LanguageOption | null>(null)
const languageOptions = ref<LanguageOption[]>([])
const dependencyOptions = ref<DependencyOption[]>([])
const dependencySelection = ref<DependencyOption[]>([])
const dependenciesLoading = ref(false)
const groupSlug = ref('')
const name = ref('')
const intro = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const visibility = ref<'public' | 'unlisted' | 'private'>('private')
const code = ref('')

const groupOptions = computed(() => groupData.value?.groups ?? [])

// ---------- 语言：初始随机样本 + 防抖远程搜索 ----------
let languageSeq = 0

async function loadLanguages(query: string) {
  const seq = ++languageSeq
  try {
    const data = await $fetch<{ languages: LanguageOption[] }>('/api/languages/search', {
      query: { q: query }
    })
    if (seq !== languageSeq) return
    const merged = [...data.languages]
    if (language.value && !merged.some(item => item.slug === language.value!.slug)) {
      merged.unshift(language.value!)
    }
    languageOptions.value = merged
  } catch {
    if (seq === languageSeq) languageOptions.value = language.value ? [language.value] : []
  }
}

const languageSearch = debounce((query: string) => { void loadLanguages(query) }, 250)

function onLanguageFilter(event: { value: string }) {
  languageSearch.run(event.value)
}

// ---------- 依赖：选定语言后随机抽样 + 防抖远程搜索 ----------
let dependencySeq = 0

async function loadDependencies(languageSlug: string, query: string) {
  const seq = ++dependencySeq
  dependenciesLoading.value = true
  try {
    const data = await $fetch<{ dependencies: DependencyOption[] }>('/api/dependencies/search', {
      query: { language: languageSlug, q: query }
    })
    if (seq !== dependencySeq) return
    dependencyOptions.value = data.dependencies
  } catch {
    if (seq === dependencySeq) dependencyOptions.value = []
  } finally {
    if (seq === dependencySeq) dependenciesLoading.value = false
  }
}

const dependencySearch = debounce((query: string) => {
  if (language.value) void loadDependencies(language.value.slug, query)
}, 250)

function onDependencyFilter(event: { value: string }) {
  dependencySearch.run(event.value)
}

// 仅用户主动切换语言时清空依赖；应用初始值时（onMounted）不能清空，否则第二步选的依赖会消失
function onLanguageChange() {
  dependencySelection.value = []
  dependencyOptions.value = []
  if (language.value) void loadDependencies(language.value.slug, '')
}

onMounted(() => {
  const initial = props.initial
  language.value = initial.language ?? null
  name.value = initial.name ?? ''
  intro.value = initial.intro ?? ''
  tags.value = [...(initial.tags ?? [])]
  visibility.value = initial.visibility ?? 'private'
  code.value = initial.code ?? ''
  groupSlug.value = initial.group ?? ''
  dependencySelection.value = [...(initial.dependencies ?? [])]

  void loadLanguages('')
  if (language.value) void loadDependencies(language.value.slug, '')
})

onBeforeUnmount(() => {
  languageSearch.cancel()
  dependencySearch.cancel()
})

const dependencyGroups = computed(() => {
  const groups = new Map<string, DependencyOption[]>()
  for (const dependency of dependencyOptions.value) {
    const label = KIND_LABELS[dependency.kind] ?? dependency.kind
    const bucket = groups.get(label)
    if (bucket) bucket.push(dependency)
    else groups.set(label, [dependency])
  }
  const order = Object.values(KIND_LABELS)
  return [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([label, items]) => ({ label, items }))
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const slugPreview = computed(() => props.slug || slugify(name.value) || 'snippet')

function hasTag(value: string) {
  return tags.value.some(tag => tag.toLowerCase() === value.toLowerCase())
}

const canAddTag = computed(() => {
  const value = tagInput.value.trim()
  return !!value && tags.value.length < 5 && !hasTag(value)
})

function addTagValue(value: string) {
  const tag = value.trim().slice(0, 32)
  if (!tag || tags.value.length >= 5 || hasTag(tag)) return
  tags.value.push(tag)
}

function addTag() {
  if (!canAddTag.value) return
  addTagValue(tagInput.value)
  tagInput.value = ''
}

function removeTag(tag: string) {
  tags.value = tags.value.filter(item => item !== tag)
}

const suggestedTags = computed(() => tagOptions.value.filter(tag => !hasTag(tag.name)).slice(0, 10))

const VISIBILITY_HINTS: Record<string, string> = {
  private: 'Only you can open it.',
  unlisted: 'Anyone with the link can open it, but it stays out of search.',
  public: 'Visible in your profile, the catalog and search.'
}

const visibilityHint = computed(() => VISIBILITY_HINTS[visibility.value] ?? '')

const codeSize = computed(() => {
  const bytes = new TextEncoder().encode(code.value).length
  return `${(bytes / 1024).toFixed(1)} KB / 1 MB`
})

const canSubmit = computed(() => !!language.value && !!name.value.trim() && !!code.value.trim())

function submit() {
  if (!canSubmit.value || !language.value) return
  emit('submit', {
    name: name.value.trim(),
    intro: intro.value.trim(),
    visibility: visibility.value,
    code: code.value,
    language: language.value.slug,
    dependencies: dependencySelection.value.map(dependency => dependency.slug),
    tags: tags.value,
    group: groupSlug.value
  })
}
</script>

<style scoped lang="scss">
.details {
  display: grid;
  grid-template-columns: minmax(0, 24rem) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.details-fields {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  min-width: 0;
}

.details-code {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--p-text-muted-color);
}

.field-hint {
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.optional {
  opacity: 0.7;
}

.inline-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------- 标签 ---------- */
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
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.78rem;
}

.tag--ghost {
  background: none;
  color: var(--p-text-muted-color);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;

  &:hover {
    color: var(--p-text-color);
    border-color: var(--p-text-color);
  }
}

.tag-suggest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.tag-suggest-label {
  font-size: 0.78rem;
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
}

.tag-remove:hover {
  opacity: 1;
}

/* ---------- 依赖选项 ---------- */
.dep-option,
.dep-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.dep-logo {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: var(--logo-tint);
}

.dep-remove {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: 1;
  opacity: 0.55;
  cursor: pointer;
}

.dep-remove:hover {
  opacity: 1;
}

/* ---------- 语言选项 ---------- */
.option-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.option-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: var(--logo-tint);
}

/* ---------- 代码 ---------- */
.code-card {
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--p-text-color) 2%, var(--p-content-background));
}

.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--p-content-border-color);
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.code-lang {
  font-weight: 600;
  color: var(--p-text-color);
}

/* ---------- 底部操作 ---------- */
.error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-red-500, #ef4444);
}

.details-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

@media (max-width: 900px) {
  .details {
    grid-template-columns: 1fr;
  }
}
</style>
