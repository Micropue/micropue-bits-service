<template>
  <div class="new-page">
    <header class="page-head">
      <h1 class="page-title">New snippet</h1>
      <p class="page-sub">Pick a language, add the stack it needs, then paste the code.</p>
    </header>

    <!-- 未登录 -->
    <section v-if="!signedIn" class="panel panel--center">
      <p class="panel-title">Sign in first</p>
      <p class="panel-body">Snippets belong to your account, so sign in before creating one.</p>
      <Button label="Sign in" @click="navigateTo('/sign')" />
    </section>

    <!-- 创建成功 -->
    <section v-else-if="created" class="panel panel--center">
      <CheckCircle class="success-icon" aria-hidden="true" />
      <p class="panel-title">Snippet created</p>
      <p class="panel-body">
        “{{ created.name }}” is saved as <strong>{{ visibilityLabel(created.visibility) }}</strong>.
      </p>
      <p v-if="created.deduplicated" class="slug-note">
        The URL name generated from “{{ created.name }}” is already taken, so it was changed to
        <code>{{ created.slug }}</code>. The snippet title is unchanged.
      </p>
      <div class="actions actions--center">
        <Button label="Create another" size="small" @click="reset" />
        <Button v-if="authUser?.usernameSet" label="View snippet" size="small" severity="secondary" outlined
          @click="navigateTo(`/${authUser.username}/${created.slug}`)" />
        <Button :label="authUser?.usernameSet ? 'Back to profile' : 'Back to account'" size="small" text
          @click="navigateTo(authUser?.usernameSet ? `/${authUser.username}` : '/account')" />
      </div>
    </section>

    <template v-else>
      <ol class="steps" aria-label="Steps">
        <li v-for="(label, index) in STEPS" :key="label" class="step"
          :class="{ 'is-active': step === index + 1, 'is-done': step > index + 1 }">
          <span class="step-dot" aria-hidden="true">{{ step > index + 1 ? '✓' : index + 1 }}</span>
          <span class="step-name">{{ label }}</span>
          <span v-if="index < STEPS.length - 1" class="step-line" aria-hidden="true" />
        </li>
      </ol>

      <section v-if="step === 1" class="step-card">
        <h2 class="step-title">Choose a language</h2>
        <p class="step-hint">Dependencies in the next step are filtered by this language.</p>
        <Select v-model="language" :options="languageOptions" option-label="name" filter fluid
          placeholder="Search languages" aria-label="Language" @filter="onLanguageFilter">
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
        <small class="step-hint">
          Missing a language? <NuxtLink to="/request?kind=language" class="inline-link">Request a new language</NuxtLink>.
        </small>
      </section>

      <section v-else-if="step === 2" class="step-card">
        <h2 class="step-title">Add dependencies</h2>
        <p class="step-hint">Optional. Only {{ language?.name }} entries from the catalog are listed.</p>

        <MultiSelect v-model="dependencySelection" :options="dependencyGroups" option-group-label="label"
          option-group-children="items" option-label="name" filter display="chip" fluid :loading="dependenciesLoading"
          placeholder="Select dependencies (optional)" aria-label="Dependencies" @filter="onDependencyFilter">
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

        <p v-if="!dependenciesLoading && !dependencyOptions.length" class="step-empty">
          No dependencies are registered for this language yet — you can skip this step.
        </p>
        <small class="step-hint">
          Missing a package? <NuxtLink to="/request?kind=dependency" class="inline-link">Request a new dependency</NuxtLink>.
        </small>
      </section>

      <section v-else class="step-card">
        <ContentForm :initial="formInitial" submit-label="Create snippet" :saving="saving" :error="error"
          @submit="create">
          <template #secondary-actions>
            <Button label="Back" severity="secondary" text @click="step = 2" />
          </template>
        </ContentForm>
      </section>

      <p v-if="error && step < 3" class="error" role="alert">{{ error }}</p>

      <div v-if="step < 3" class="step-actions">
        <Button v-if="step > 1" label="Back" severity="secondary" text @click="step--" />
        <span class="spacer" />
        <Button v-if="step === 2" label="Skip" severity="secondary" text @click="step = 3" />
        <Button label="Next" :disabled="!canContinue" @click="step++" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import CheckCircle from '@primeicons/vue/check-circle'
import type { ContentFormPayload } from '~/components/ContentForm.vue'

// 创建代码段向导：语言 → 依赖 → 详情/代码（详情表单与编辑页共用 ContentForm）
definePageMeta({ layout: 'default' })

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

interface CreatedSnippet {
  sid: string
  slug: string
  name: string
  visibility: string
  deduplicated: boolean
}

const STEPS = ['Language', 'Dependencies', 'Details']

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

const { user: authUser, refresh } = useAuthUser()
if (import.meta.client) await refresh()
const signedIn = computed(() => !!authUser.value)

const step = ref(1)
const language = ref<LanguageOption | null>(null)
const languageOptions = ref<LanguageOption[]>([])
const dependencyOptions = ref<DependencyOption[]>([])
const dependencySelection = ref<DependencyOption[]>([])
const dependenciesLoading = ref(false)
const saving = ref(false)
const error = ref('')
const created = ref<CreatedSnippet | null>(null)

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

watch(language, next => {
  dependencySelection.value = []
  dependencyOptions.value = []
  if (next) void loadDependencies(next.slug, '')
})

onMounted(() => {
  void loadLanguages('')
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

const canContinue = computed(() => (step.value === 1 ? !!language.value : true))

const formInitial = computed(() => ({
  language: language.value,
  dependencies: dependencySelection.value
}))

function visibilityLabel(value: string) {
  return VISIBILITY_OPTIONS.find(option => option.value === value)?.label ?? value
}

async function create(payload: ContentFormPayload) {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const response = await $fetch<{ snippet: CreatedSnippet }>('/api/contents', {
      method: 'POST',
      body: payload
    })
    created.value = response.snippet
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string, data?: { data?: { field?: string } } }
    if (e.statusCode === 401) {
      error.value = 'Your session expired — please sign in again.'
      await refresh()
    } else {
      const field = e.data?.data?.field
      if (field === 'language') step.value = 1
      else if (field === 'dependencies') step.value = 2
      error.value = e.statusMessage ?? 'Something went wrong, please try again.'
    }
  } finally {
    saving.value = false
  }
}

function reset() {
  created.value = null
  step.value = 1
  language.value = null
  languageOptions.value = []
  dependencySelection.value = []
  dependencyOptions.value = []
  error.value = ''
  void loadLanguages('')
}

useHead({
  title: 'New snippet',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
.new-page {
  width: min(1120px, 94vw);
  margin: 0 auto;
  padding: 3.5rem 0 5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.page-sub {
  margin: 0.4rem 0 0;
  color: var(--p-text-muted-color);
  line-height: 1.7;
}

/* ---------- 步骤指示 ---------- */
.steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.step-dot {
  display: grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 50%;
  font-size: 0.72rem;
}

.step.is-active {
  color: var(--p-text-color);
}

.step.is-active .step-dot {
  background: var(--p-text-color);
  border-color: var(--p-text-color);
  color: var(--p-primary-contrast-color);
}

.step.is-done .step-dot {
  border-color: var(--p-text-muted-color);
  color: var(--p-text-muted-color);
}

.step-line {
  width: 2.5rem;
  height: 1px;
  margin: 0 0.25rem;
  background: var(--p-content-border-color);
}

/* ---------- 步骤卡片 ---------- */
.step-card {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-content-background);
}

.step-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.step-hint,
.step-empty {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.inline-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* 选项内图标 */
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

/* ---------- 底部操作 ---------- */
.step-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.spacer {
  flex: 1;
}

.error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-red-500, #ef4444);
}

/* ---------- 未登录 / 成功 ---------- */
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.6rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-content-background);
}

.panel--center {
  align-items: center;
  text-align: center;
}

.panel-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.panel-body {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
}

.slug-note {
  max-width: 36rem;
  margin: 0;
  padding: 0.55rem 0.75rem;
  border: 1px solid color-mix(in srgb, #d97706 35%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, #d97706 8%, transparent);
  font-size: 0.82rem;
  line-height: 1.6;
  text-align: left;

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.actions--center {
  justify-content: center;
}

.action-link {
  color: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.success-icon {
  width: 2rem;
  height: 2rem;
}
</style>
