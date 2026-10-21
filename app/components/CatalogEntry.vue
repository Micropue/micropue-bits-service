<template>
  <article class="catalog-entry" :class="{ 'is-embedded': embedded }">
    <div class="logo-stage">
      <img v-if="entry.logo_url" class="logo" :src="entry.logo_url" :alt="`${entry.name} logo`" width="150"
        height="150" loading="lazy" decoding="async" />
      <!-- 无图标条目（如 SQL、Matplotlib）用文字标识兜底 -->
      <span v-else class="logo-fallback">{{ entry.name }}</span>
    </div>

    <header class="heading">
      <p class="eyebrow">{{ label }}</p>
      <h1 class="name">{{ entry.name }}</h1>
      <p v-if="entry.intro" class="intro">{{ entry.intro }}</p>
    </header>

    <div v-if="entry.link_url" class="actions">
      <Button as="a" :href="entry.link_url" target="_blank" rel="noopener noreferrer" class="official-link">
        <ExternalLink aria-hidden="true" />
        <span>Official Website</span>
      </Button>
    </div>

    <div v-if="related?.length" class="related">
      <section v-for="group in related" :key="group.label" class="group">
        <h2 class="group-title">
          {{ group.label }}
          <span class="group-count">{{ group.items.length }}</span>
          <!-- 清单被随机截断时提示还有多少条（可直链或检索到达） -->
          <span v-if="group.total > group.items.length" class="group-more">+{{ group.total - group.items.length }} more</span>
        </h2>
        <ul class="chips">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink :to="item.to" class="chip">
              <span class="chip-logo">
                <img v-if="item.logo_url" :src="item.logo_url" alt="" width="18" height="18" loading="lazy"
                  decoding="async" />
                <span v-else class="chip-initial">{{ item.name.slice(0, 1) }}</span>
              </span>
              <span class="chip-name">{{ item.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import ExternalLink from '@primeicons/vue/external-link'
import type { CatalogEntryData, CatalogRelatedGroup } from '~/composables/useCatalogEntry'

// 目录项展示页（编程语言 / 框架 / 库 / 工具 / 运行时共用）
defineProps<{ entry: CatalogEntryData; label: string; related?: CatalogRelatedGroup[]; embedded?: boolean }>()
</script>

<style scoped>
.catalog-entry {
  width: min(760px, 92vw);
  margin: 0 auto;
  padding: clamp(3rem, 9vh, 6rem) 0 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2.25rem;
}

/* 目录详情页两栏布局：目录项嵌在左栏，页面容器由 CatalogDetailLayout 提供 */
.catalog-entry.is-embedded {
  width: 100%;
  margin: 0;
  padding: 0;
}

/* LOGO 底座与着色见 main.scss 的 --logo-plate / --logo-tint（深色主题无白底、反白） */
.logo-stage {
  width: clamp(156px, 33vw, 224px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 32px;
  background: var(--logo-plate);
  box-shadow:
    0 0 0 1px var(--p-content-border-color) inset,
    0 30px 60px -45px rgba(0, 0, 0, 0.65);
}

.logo {
  display: block;
  width: 68%;
  height: auto;
  filter: var(--logo-tint);
}

.logo-fallback {
  font-size: clamp(1.5rem, 5vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--logo-ink);
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

/* ---------- 关联区块 ---------- */
.related {
  width: 100%;
  margin-top: 1rem;
  padding-top: 2.75rem;
  border-top: 1px solid var(--p-content-border-color);
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
  text-align: left;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.group-count {
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--p-text-color) 8%, var(--p-content-background));
  font-size: 0.7rem;
  letter-spacing: 0;
}

.group-more {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--p-text-muted-color);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0.9rem 0.35rem 0.35rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  color: inherit;
  font-size: 0.95rem;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}

.chip:hover {
  background: color-mix(in srgb, var(--p-text-color) 6%, var(--p-content-background));
  border-color: color-mix(in srgb, var(--p-text-color) 25%, var(--p-content-border-color));
}

/* LOGO 底座与着色同顶部大 LOGO（变量见 main.scss） */
.chip-logo {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 4px;
  border-radius: 8px;
  background: var(--logo-plate);
  box-shadow: 0 0 0 1px var(--p-content-border-color) inset;
}

.chip-logo img {
  display: block;
  width: 100%;
  height: 100%;
  filter: var(--logo-tint);
}

.chip-initial {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--logo-ink);
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
.actions,
.related {
  animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.heading {
  animation-delay: 0.08s;
}

.actions {
  animation-delay: 0.16s;
}

.related {
  animation-delay: 0.24s;
}

@media (prefers-reduced-motion: reduce) {

  .logo-stage,
  .heading,
  .actions,
  .related {
    animation: none;
  }
}
</style>
