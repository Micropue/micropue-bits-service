<template>
  <div class="request">
    <h1 class="page-title">Submit an entry</h1>
    <p class="lead">
      Missing a language or a package? Send us the essentials — name and official website (for packages also the type
      and the languages it belongs to). A site administrator completes the rest and publishes it, so keep an eye on the
      catalog.
    </p>

    <!-- 未登录：先登录再提交 -->
    <section v-if="!signedIn" class="panel">
      <p class="panel-title">Sign in first</p>
      <p class="panel-body">
        Submissions are linked to your BITS account so we can get back to you about the review result.
      </p>
      <NuxtLink to="/sign" class="action-link">Sign in with your account</NuxtLink>
    </section>

    <template v-else>
      <!-- 提交成功 -->
      <section v-if="submitted" class="panel">
        <p class="panel-title">Thanks — your request is in the review queue</p>
        <p class="panel-body">
          We will publish <strong>{{ submittedName }}</strong> once an administrator fills in the remaining details.
          You can submit another entry any time.
        </p>
        <div class="actions">
          <Button label="Submit another" size="small" @click="reset" />
          <NuxtLink :to="kind === 'language' ? '/languages' : '/dependencies'" class="action-link">
            Browse {{ kind === 'language' ? 'languages' : 'dependencies' }}
          </NuxtLink>
        </div>
      </section>

      <form v-else class="panel form" @submit.prevent="submit">
        <div class="kind-switch" role="tablist" aria-label="Entry type">
          <button v-for="option in KIND_OPTIONS" :key="option.value" type="button" class="kind-option"
            :class="{ 'is-active': kind === option.value }" role="tab" :aria-selected="kind === option.value"
            @click="switchKind(option.value)">
            {{ option.label }}
          </button>
        </div>

        <label class="field" for="request-name">
          <span>{{ kind === 'language' ? 'Language name' : 'Package name' }}</span>
          <InputText id="request-name" v-model="form.name" name="name" maxlength="64" autocomplete="off" fluid
            :placeholder="kind === 'language' ? 'Zig' : 'Biome'" />
        </label>

        <label class="field" for="request-link">
          <span>Official website</span>
          <InputText id="request-link" v-model="form.link_url" name="link_url" autocomplete="off" fluid
            placeholder="https://…" />
        </label>

        <template v-if="kind === 'dependency'">
          <label class="field" for="request-type">
            <span>Type</span>
            <Select input-id="request-type" v-model="form.dependency_kind" :options="KIND_TYPE_OPTIONS"
              option-label="label" option-value="value" fluid />
          </label>
          <label class="field" for="request-languages">
            <span>Languages it belongs to</span>
            <MultiSelect input-id="request-languages" v-model="form.language_sids" :options="languageOptions"
              option-label="label" option-value="value" filter :max-selected-labels="4" fluid
              placeholder="Pick one or more" />
            <small class="hint">The first one you pick becomes the primary language.</small>
          </label>
        </template>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <div class="submit-row">
          <Button type="submit" label="Submit for review" :loading="saving"
            :disabled="!canSubmit" />
          <span class="hint">Icons, descriptions and ordering are filled in by the reviewer.</span>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
// 目录条目申请（新语言 / 新依赖）：用户只填核心信息，审核通过时由管理员补全其余字段
// 规则详见 docs-internal/项目综合设计.md「目录条目申请与审核」
useHead({ title: 'Submit an entry' })

const route = useRoute()
const { user: authUser, refresh } = useAuthUser()

type RequestKind = 'language' | 'dependency'

const KIND_OPTIONS = [
  { label: 'Language', value: 'language' as RequestKind },
  { label: 'Dependency', value: 'dependency' as RequestKind }
]

const KIND_TYPE_OPTIONS = [
  { label: 'Framework', value: 'framework' },
  { label: 'Library', value: 'library' },
  { label: 'Tool', value: 'tool' },
  { label: 'Runtime', value: 'runtime' }
]

const kind = ref<RequestKind>(route.query.kind === 'dependency' ? 'dependency' : 'language')
const form = ref({ name: '', link_url: '', dependency_kind: 'library', language_sids: [] as string[] })
const saving = ref(false)
const error = ref('')
const submitted = ref(false)
const submittedName = ref('')

// 登录态：SSR 已由布局初始化，这里再对齐一次（避免会话过期后仍显示表单）
if (import.meta.client) await refresh()
const signedIn = computed(() => !!authUser.value)

// 依赖申请需要语言多选（取语言目录）
const { data: languageData } = await useFetch<{ languages: { slug: string, name: string }[] }>('/api/languages')
const languageOptions = computed(() =>
  (languageData.value?.languages ?? [])
    .map(language => ({ label: language.name, value: language.slug }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))

const URL_RE = /^https?:\/\/[^\s]+$/i
const canSubmit = computed(() =>
  form.value.name.trim().length >= 2 &&
  URL_RE.test(form.value.link_url.trim()) &&
  (kind.value === 'language' || (form.value.language_sids.length > 0 && !!form.value.dependency_kind)))

function switchKind(next: RequestKind) {
  kind.value = next
  error.value = ''
  // 语言与依赖的字段不同，切换时清掉可能不适用的一半
  if (next === 'language') form.value.language_sids = []
}

function reset() {
  submitted.value = false
  submittedName.value = ''
  form.value = { name: '', link_url: '', dependency_kind: 'library', language_sids: [] }
  error.value = ''
}

async function submit() {
  if (saving.value || !canSubmit.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/catalog-requests', {
      method: 'POST',
      body: {
        kind: kind.value,
        name: form.value.name.trim(),
        link_url: form.value.link_url.trim(),
        dependency_kind: kind.value === 'dependency' ? form.value.dependency_kind : undefined,
        language_slugs: kind.value === 'dependency' ? form.value.language_sids : undefined
      }
    })
    submittedName.value = form.value.name.trim()
    submitted.value = true
  } catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string, data?: { data?: { field?: string, retryAfterSeconds?: number } } }
    if (e.statusCode === 401) {
      error.value = 'Your session expired — please sign in again.'
      await refresh()
    } else if (e.statusCode === 429) {
      const retry = Math.ceil(Number(e.data?.data?.retryAfterSeconds ?? 0))
      error.value = retry >= 60
        ? `Too many submissions. Please try again in ${Math.ceil(retry / 60)} min.`
        : 'Too many submissions, please try again later.'
    } else {
      error.value = e.statusMessage ?? 'Something went wrong. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.request {
  width: min(720px, 90vw);
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

.lead {
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.7;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.6rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 16px;
  background: var(--p-content-background);
}

.panel-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.panel-body {
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.7;
}

.action-link {
  align-self: flex-start;
  color: var(--p-text-color);
  font-weight: 500;
}

.form {
  gap: 1.15rem;
}

.kind-switch {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.2rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  gap: 0.2rem;
}

.kind-option {
  padding: 0.4rem 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--p-text-muted-color);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;

  &.is-active {
    background: var(--p-primary-color);
    color: var(--p-primary-inverse-color);
    font-weight: 600;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;

  > span {
    color: var(--p-text-color);
  }
}

.hint {
  color: var(--p-text-muted-color);
  font-size: 0.78rem;
  font-weight: 400;
}

.error {
  margin: 0;
  color: var(--p-red-500);
  font-size: 0.9rem;
}

.submit-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
