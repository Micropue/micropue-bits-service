<template>
  <div class="edit-page">
    <header class="page-head">
      <p class="eyebrow">Edit snippet</p>
      <h1 class="page-title">{{ initial?.name || 'Edit snippet' }}</h1>
      <p class="page-sub">URL: <code>/{{ username }}/{{ slug }}</code> · the URL name cannot be changed.</p>
    </header>

    <section v-if="!signedIn" class="panel panel--center">
      <p class="panel-title">Sign in first</p>
      <p class="panel-body">Only the owner can edit this snippet.</p>
      <Button label="Sign in" @click="navigateTo('/sign')" />
    </section>

    <div v-else-if="pending" class="state-panel">Loading…</div>

    <section v-else-if="error || !initial" class="state-panel">
      <p class="state-title">Snippet not found</p>
      <p class="state-text">It may have been removed, or it belongs to another account.</p>
      <Button label="Back to profile" severity="secondary" text @click="navigateTo(`/${username}`)" />
    </section>

    <template v-else>
      <ContentForm :initial="initial" :slug="slug" submit-label="Save changes" :saving="saving" :error="errorMessage"
        @submit="save">
        <template #secondary-actions>
          <Button label="Cancel" severity="secondary" text @click="navigateTo(`/${username}/${slug}`)" />
          <Button label="Delete" severity="danger" text :loading="deleting" @click="askDelete" />
        </template>
      </ContentForm>
      <p v-if="pageError" class="error" role="alert">{{ pageError }}</p>
    </template>

    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import type { ContentFormInitial, ContentFormPayload } from '~/components/ContentForm.vue'

// 编辑代码段（仅作者本人）：/{username}/{slug}/edit；slug 不可修改
definePageMeta({ layout: 'default' })

interface EditResponse {
  snippet: {
    slug: string
    name: string
    intro: string
    visibility: 'public' | 'unlisted' | 'private'
    code: string
    language: { slug: string, name: string, logo_url: string | null } | null
    group: string
    tags: string[]
    dependencies: { slug: string, name: string, kind: string, logo_url: string | null }[]
  }
}

const route = useRoute()
const username = String(route.params.username ?? '')
const slug = String(route.params.slug ?? '')

const { user, refresh } = useAuthUser()
if (import.meta.client) await refresh()
const signedIn = computed(() => !!user.value)

const { data, pending, error } = await useFetch<EditResponse>(`/api/contents/${encodeURIComponent(slug)}`, {
  key: `edit-snippet-${slug}`,
  immediate: signedIn.value
})

const initial = computed<ContentFormInitial | null>(() => {
  const snippet = data.value?.snippet
  if (!snippet) return null
  return {
    language: snippet.language,
    dependencies: snippet.dependencies,
    name: snippet.name,
    intro: snippet.intro,
    tags: snippet.tags,
    visibility: snippet.visibility,
    code: snippet.code,
    group: snippet.group
  }
})

const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const pageError = ref('')

async function save(payload: ContentFormPayload) {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/contents/${encodeURIComponent(slug)}`, { method: 'PATCH', body: payload })
    await navigateTo(`/${username}/${slug}`)
  } catch (err) {
    errorMessage.value = (err as { statusMessage?: string }).statusMessage ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

const confirm = useConfirm()

function askDelete() {
  confirm.require({
    header: 'Delete snippet',
    message: `Delete “${initial.value?.name ?? slug}”? The public link will stop working.`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: async () => {
      deleting.value = true
      pageError.value = ''
      try {
        await $fetch(`/api/contents/${encodeURIComponent(slug)}`, { method: 'DELETE' })
        await navigateTo(`/${username}`)
      } catch (err) {
        pageError.value = (err as { statusMessage?: string }).statusMessage ?? 'Delete failed'
      } finally {
        deleting.value = false
      }
    }
  })
}

useHead({
  title: 'Edit snippet',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped lang="scss">
.edit-page {
  width: min(1120px, 94vw);
  margin: 0 auto;
  padding: 3.5rem 0 5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
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

.page-sub code {
  font-family: var(--font-code);
  font-size: 0.85em;
}

.cancel-link {
  color: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.panel,
.state-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.6rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-content-background);
}

.panel--center,
.state-panel {
  align-items: center;
  text-align: center;
}

.panel-title,
.state-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.panel-body,
.state-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
}

.action-link {
  color: inherit;
  font-size: 0.85rem;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-red-500, #ef4444);
}
</style>
