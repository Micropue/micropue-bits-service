<template>
  <article class="language-page">
    <div class="logo-stage">
      <img v-if="language.logo_url" class="logo" :src="language.logo_url" :alt="`${language.name} logo`" />
      <!-- 无图标语言（如 SQL）用文字标识兜底 -->
      <span v-else class="logo-fallback">{{ language.name }}</span>
    </div>

    <header class="heading">
      <p class="eyebrow">Programming Language</p>
      <h1 class="name">{{ language.name }}</h1>
      <p v-if="language.intro" class="intro">{{ language.intro }}</p>
    </header>

    <div class="actions">
      <Button v-if="language.link_url" as="a" :href="language.link_url" target="_blank" rel="noopener noreferrer"
        class="official-link">
        <ExternalLink aria-hidden="true" />
        <span>Official Website</span>
      </Button>
    </div>
  </article>
</template>

<script setup lang="ts">
import ExternalLink from '@primeicons/vue/external-link'

interface Language {
  slug: string
  name: string
  intro: string
  logo_url: string | null
  link_url: string | null
}

const route = useRoute()
// 响应式地址：从 /language/a 切到 /language/b 时自动重新取数
const { data } = await useFetch<{ language: Language }>(() => `/api/languages/${route.params.slug}`)

const language = computed(() => data.value?.language ?? null)
if (!language.value) {
  throw createError({ statusCode: 404, statusMessage: 'Language not found' })
}

// 站点标题后缀「| BITS」由 app.vue 的 titleTemplate 统一追加
useHead({ title: computed(() => language.value?.name ?? 'Not Found') })
useSeoMeta({ description: () => language.value?.intro })
</script>

<style scoped>
.language-page {
  width: min(760px, 92vw);
  margin: 0 auto;
  padding: clamp(3rem, 9vh, 6rem) 0 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2.25rem;
}

/* 固定浅底：深色主题下深色 LOGO（如 Rust）同样清晰 */
.logo-stage {
  width: clamp(156px, 33vw, 224px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 32px;
  background: #fff;
  box-shadow:
    0 0 0 1px var(--p-content-border-color) inset,
    0 30px 60px -45px rgba(0, 0, 0, 0.65);
}

.logo {
  display: block;
  width: 68%;
  height: auto;
}

.logo-fallback {
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #18181b;
}

.heading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.name {
  margin: 0;
  font-size: clamp(2.2rem, 7vw, 3.4rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.intro {
  margin: 0;
  max-width: 58ch;
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
}

.official-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.official-link :deep(svg) {
  width: 1.05em;
  height: 1.05em;
}

/* 入场：自上而下轻微上浮，逐块错开 */
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.logo-stage,
.heading,
.actions {
  animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.heading {
  animation-delay: 0.08s;
}

.actions {
  animation-delay: 0.16s;
}

@media (prefers-reduced-motion: reduce) {

  .logo-stage,
  .heading,
  .actions {
    animation: none;
  }
}
</style>
