<template>
  <article class="legal">
    <header class="head">
      <h1 class="title">{{ title }}</h1>
      <p class="effective">Effective date: {{ effective }}</p>

      <nav class="docs" aria-label="Legal documents">
        <NuxtLink v-for="doc in docs" :key="doc.to" :to="doc.to" class="doc-link"
          :class="{ 'doc-link--current': isCurrent(doc.to) }">{{ doc.name }}</NuxtLink>
      </nav>
    </header>

    <div class="body">
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
// 三个法务页共用的容器：标题 / 生效日期 / 文档相互跳转 / 正文排版
defineProps<{ title: string; effective: string }>()

const route = useRoute()

const docs = [
  { to: '/legal/terms', name: 'Legal Terms' },
  { to: '/legal/privacy', name: 'Privacy Policy' },
  { to: '/legal/cookies', name: 'Cookies Policy' }
]

const isCurrent = (to: string) => route.path === to
</script>

<style lang="scss" scoped>
.legal {
  width: min(760px, 92vw);
  margin: 0 auto;
  padding: 3.5rem 0 5rem;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.effective {
  margin: 0;
  font-size: 0.88rem;
  color: var(--p-text-muted-color);
}

.docs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.doc-link {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  color: inherit;
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.15s;
}

.doc-link:hover {
  background: color-mix(in srgb, var(--p-text-color) 6%, var(--p-content-background));
}

.doc-link--current {
  border-color: color-mix(in srgb, var(--p-text-color) 30%, var(--p-content-border-color));
  font-weight: 600;
}

/* ---------- 正文排版（内容由各页面提供，故用 :deep） ---------- */
.body {
  padding-top: 2.25rem;
}

.body :deep(h2) {
  margin: 2.5rem 0 0.85rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.body :deep(h2:first-child) {
  margin-top: 0;
}

.body :deep(p) {
  margin: 0 0 1rem;
  line-height: 1.75;
  color: var(--p-text-muted-color);
}

.body :deep(ul) {
  margin: 0 0 1rem;
  padding-left: 1.15rem;
}

.body :deep(li) {
  margin-bottom: 0.4rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
}

.body :deep(a) {
  color: var(--p-text-color);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.body :deep(strong) {
  color: var(--p-text-color);
  font-weight: 600;
}
</style>
