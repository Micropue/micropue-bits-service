<template>
  <h2 class="section-title">Favorites</h2>

  <div class="fav-toolbar">
    <SelectButton v-model="kind" :options="KIND_OPTIONS" option-label="label" option-value="value"
      :allow-empty="false" aria-label="Favorite type" @update:model-value="reload" />
    <InputText v-model="query" size="small" placeholder="Search favorites" aria-label="Search favorites"
      autocomplete="off" />
  </div>

  <div v-if="loading && !items.length" class="fav-state">Loading…</div>
  <p v-else-if="!items.length" class="fav-state">
    {{ query.trim() ? 'No favorites match this search.' : 'No saved content yet.' }}
  </p>
  <div v-else class="fav-grid">
    <article v-for="item in items" :key="`${item.kind}-${item.slug}`" class="fav-card">
      <NuxtLink :to="`/${item.author.username}/${item.slug}`" class="fav-link">
        <div class="fav-head">
          <span class="fav-lang">
            <img v-if="item.language?.logo_url" :src="item.language.logo_url" alt="" width="14" height="14"
              loading="lazy">
            {{ item.language?.name ?? (item.kind === 'group' ? 'Group' : 'Snippet') }}
          </span>
          <span class="fav-date">{{ formatDate(item.favoritedAt) }}</span>
        </div>
        <h3 class="fav-name">{{ item.name }}</h3>
        <p v-if="item.intro" class="fav-intro">{{ item.intro }}</p>
        <p class="fav-author">@{{ item.author.username }} · {{ item.author.nickname }}</p>
        <div class="fav-tags">
          <span v-if="item.kind === 'group'" class="tag">{{ item.snippetCount }} snippets</span>
          <span v-for="tag in item.tags" :key="tag.key" class="tag">{{ tag.name }}</span>
        </div>
        <div class="fav-traffic">
          <span v-if="item.kind === 'snippet'" :title="`Copies: ${item.copyCount}`">
            <Copy aria-hidden="true" />{{ item.copyCount }}
          </span>
          <span :title="`Forks: ${item.forkCount}`"><CodeBranch aria-hidden="true" />{{ item.forkCount }}</span>
          <span :title="`Favorites: ${item.favoriteCount}`"><Bookmark aria-hidden="true" />{{ item.favoriteCount }}</span>
        </div>
      </NuxtLink>
      <div class="fav-actions">
        <Button label="Remove" size="small" text severity="danger" :loading="removing === item.slug"
          @click="removeFavorite(item)" />
      </div>
    </article>
  </div>

  <div v-if="items.length < total" class="fav-more">
    <Button label="Load more" size="small" severity="secondary" outlined :loading="loading" @click="load(false)" />
  </div>
</template>

<script setup lang="ts">
import Bookmark from '@primeicons/vue/bookmark'
import CodeBranch from '@primeicons/vue/code-branch'
import Copy from '@primeicons/vue/copy'

const KIND_OPTIONS = [
  { label: 'Snippets', value: 'snippet' },
  { label: 'Groups', value: 'group' }
]

interface FavoriteItem {
  sid: string
  kind: 'snippet' | 'group'
  slug: string
  name: string
  intro: string
  visibility: string
  updated_at: string
  favoritedAt: string
  copyCount: number
  forkCount: number
  favoriteCount: number
  snippetCount?: number
  language: { slug: string, name: string, logo_url: string | null } | null
  author: { username: string, nickname: string, avatarUrl: string | null }
  tags: { key: string, name: string }[]
}

useHead({ title: 'Favorites' })

const toast = useToast()
const kind = ref<'snippet' | 'group'>('snippet')
const query = ref('')
const items = ref<FavoriteItem[]>([])
const total = ref(0)
const loading = ref(false)
const removing = ref('')
let seq = 0

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

async function load(reset: boolean) {
  const current = ++seq
  const offset = reset ? 0 : items.value.length
  loading.value = true
  try {
    const response = await $fetch<{ items: FavoriteItem[], total: number }>('/api/favorites', {
      query: { kind: kind.value, q: query.value.trim(), limit: 12, offset }
    })
    if (current !== seq) return
    items.value = reset ? response.items : [...items.value, ...response.items]
    total.value = response.total
  } catch {
    if (current === seq && reset) {
      items.value = []
      total.value = 0
    }
  } finally {
    if (current === seq) loading.value = false
  }
}

function reload() {
  void load(true)
}

const search = debounce(() => { void load(true) }, 250)
watch(query, () => search.run())

async function removeFavorite(item: FavoriteItem) {
  if (removing.value) return
  removing.value = item.slug
  try {
    await $fetch(`/api/users/${encodeURIComponent(item.author.username)}/${encodeURIComponent(item.slug)}/favorite`, {
      method: 'DELETE'
    })
    items.value = items.value.filter(entry => !(entry.kind === item.kind && entry.slug === item.slug))
    total.value = Math.max(0, total.value - 1)
    toast.add({ severity: 'success', summary: 'Removed from favorites', life: 2500 })
  } catch (err) {
    toast.add({ severity: 'error', summary: (err as { statusMessage?: string }).statusMessage ?? 'Could not remove favorite', life: 4000 })
  } finally {
    removing.value = ''
  }
}

onMounted(() => { void load(true) })
</script>

<style scoped lang="scss">
.fav-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem 0 1.25rem;

  :deep(.p-inputtext) {
    width: 17rem;
    max-width: 45vw;
  }
}

.fav-state {
  padding: 2rem 0;
  color: var(--p-text-muted-color);
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.9rem;
}

.fav-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.8rem;
  background: var(--p-content-background);
  overflow: hidden;
}

.fav-link {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.9rem;
  color: inherit;
  text-decoration: none;
}

.fav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.fav-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}

.fav-date {
  font-size: 0.7rem;
  color: var(--p-text-muted-color);
}

.fav-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.fav-intro {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--p-text-muted-color);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.fav-author {
  margin: 0;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.fav-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: auto;
  padding-top: 0.25rem;
}

.tag {
  padding: 0.06rem 0.4rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.68rem;
  color: var(--p-text-muted-color);
}

.fav-traffic {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--p-text-muted-color);

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  svg {
    width: 0.82rem;
    height: 0.82rem;
    opacity: 0.65;
  }
}

.fav-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 0.6rem 0.5rem;
}

.fav-more {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

@media (max-width: 700px) {
  .fav-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .fav-toolbar :deep(.p-inputtext) {
    width: 100%;
    max-width: none;
  }
}
</style>
