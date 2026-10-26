<template>
  <div class="changelog-page">
    <header class="changelog-head">
      <p class="changelog-kicker">Bits</p>
      <h1 class="changelog-title">Changelog</h1>
      <p class="changelog-sub">Product updates, new features and fixes — newest first.</p>
    </header>

    <div v-if="!entries.length && !pending" class="changelog-empty">No updates have been published yet.</div>

    <div v-else class="timeline">
      <article v-for="entry in entries" :key="entry.sid" class="timeline-entry">
        <span class="timeline-dot" aria-hidden="true" />
        <div class="timeline-main">
          <time class="timeline-date" :datetime="entry.publishedAt">{{ formatDate(entry.publishedAt) }}</time>
          <h2 class="timeline-title">{{ entry.title }}</h2>
          <p class="timeline-body">{{ entry.body }}</p>
        </div>
      </article>
    </div>

    <div v-if="entries.length < total" class="changelog-more">
      <Button label="Load older updates" size="small" severity="secondary" outlined :loading="pending" @click="loadMore" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Entry {
  sid: string
  title: string
  body: string
  publishedAt: string
}

const { data, pending } = await useFetch<{ entries: Entry[], total: number }>('/api/changelogs', {
  query: { limit: 20 }
})

const entries = ref<Entry[]>(data.value?.entries ?? [])
const total = ref(data.value?.total ?? 0)

watch(data, value => {
  if (!value) return
  entries.value = value.entries
  total.value = value.total
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'long' })
}

async function loadMore() {
  const response = await $fetch<{ entries: Entry[], total: number }>('/api/changelogs', {
    query: { limit: 20, offset: entries.value.length }
  })
  entries.value = [...entries.value, ...response.entries]
  total.value = response.total
}

useHead({
  title: 'Changelog · BITS',
  meta: [{ name: 'description', content: 'Product updates and release notes for BITS.' }]
})
useSeoMeta({
  ogType: 'website',
  ogTitle: 'BITS changelog',
  ogDescription: 'Product updates and release notes for BITS.',
  twitterTitle: 'BITS changelog',
  twitterDescription: 'Product updates and release notes for BITS.'
})
</script>

<style scoped lang="scss">
.changelog-page {
  width: min(820px, 92vw);
  margin: 0 auto;
  padding: 4rem 0 6rem;
}

.changelog-head {
  margin-bottom: 3rem;
}

.changelog-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.changelog-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.8rem);
  letter-spacing: -0.03em;
}

.changelog-sub {
  margin: 0.65rem 0 0;
  color: var(--p-text-muted-color);
}

.changelog-empty {
  padding: 2rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 0.9rem;
  color: var(--p-text-muted-color);
  text-align: center;
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2.2rem;
  padding-left: 1.6rem;

  &::before {
    content: '';
    position: absolute;
    top: 0.45rem;
    bottom: 0.45rem;
    left: 0.32rem;
    width: 1px;
    background: var(--p-content-border-color);
  }
}

.timeline-entry {
  position: relative;
}

.timeline-dot {
  position: absolute;
  top: 0.45rem;
  left: -1.6rem;
  width: 0.7rem;
  height: 0.7rem;
  border: 2px solid var(--p-content-background);
  border-radius: 50%;
  background: var(--p-primary-color);
  box-shadow: 0 0 0 1px var(--p-content-border-color);
}

.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.timeline-date {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.timeline-title {
  margin: 0;
  font-size: 1.18rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.timeline-body {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.75;
  color: var(--p-text-color);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.changelog-more {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
}
</style>
