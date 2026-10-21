<template>
  <div class="docs-page">
    <header class="docs-top">
      <div class="docs-intro">
        <p class="docs-eyebrow">Bits Docs</p>
        <p class="docs-heading">{{ locale === 'zh' ? '使用文档' : 'Documentation' }}</p>
        <p class="docs-sub">
          {{ locale === 'zh' ? '了解站点功能与使用方法。' : 'Feature guides and how-tos for Bits.' }}
        </p>
      </div>
      <div class="docs-lang" role="group" :aria-label="locale === 'zh' ? '语言' : 'Language'">
        <Globe class="docs-lang-icon" aria-hidden="true" />
        <button type="button" class="docs-lang-option" :class="{ 'is-active': locale === 'en' }"
          :aria-pressed="locale === 'en'" @click="setLocale('en')">EN</button>
        <span class="docs-lang-sep" aria-hidden="true">/</span>
        <button type="button" class="docs-lang-option" :class="{ 'is-active': locale === 'zh' }"
          :aria-pressed="locale === 'zh'" @click="setLocale('zh')">中文</button>
      </div>
    </header>

    <div class="docs-layout">
      <!-- 左：章节目录 -->
      <aside class="docs-side">
        <nav class="docs-nav" :aria-label="locale === 'zh' ? '文档目录' : 'Documentation chapters'">
          <NuxtLink v-for="(item, i) in chapters" :key="item.slug" :to="`/docs/${item.slug}`" class="docs-nav-item"
            :class="{ 'is-active': item.slug === chapter.slug }"
            :aria-current="item.slug === chapter.slug ? 'page' : undefined">
            <span class="docs-nav-num">{{ chapterNumber(i) }}</span>
            <span class="docs-nav-title">{{ item.title[locale] }}</span>
          </NuxtLink>
        </nav>
      </aside>

      <!-- 右：当前章节 -->
      <main class="docs-main">
        <article class="docs-article">
          <header class="docs-article-head">
            <h1 class="docs-article-title">{{ chapter.title[locale] }}</h1>
            <p class="docs-article-summary">{{ chapter.summary[locale] }}</p>
          </header>

          <template v-for="(block, index) in chapter.blocks[locale]" :key="index">
            <h2 v-if="block.type === 'h'" class="docs-h2">{{ block.text }}</h2>
            <p v-else-if="block.type === 'p'" class="docs-p">{{ block.text }}</p>
            <ul v-else-if="block.type === 'ul'" class="docs-list">
              <li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li>
            </ul>
            <ol v-else-if="block.type === 'ol'" class="docs-list">
              <li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li>
            </ol>
            <pre v-else-if="block.type === 'code'" class="docs-code"><code>{{ block.text }}</code></pre>
            <p v-else-if="block.type === 'note'" class="docs-note">{{ block.text }}</p>
            <div v-else-if="block.type === 'table'" class="docs-table-wrap">
              <table class="docs-table">
                <thead>
                  <tr>
                    <th v-for="(header, headerIndex) in block.headers" :key="headerIndex">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
                    <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </article>

        <nav class="docs-pager" :aria-label="locale === 'zh' ? '章节导航' : 'Chapter navigation'">
          <NuxtLink v-if="prevChapter" :to="`/docs/${prevChapter.slug}`" class="docs-pager-link">
            ← {{ prevChapter.title[locale] }}
          </NuxtLink>
          <span v-else />
          <NuxtLink v-if="nextChapter" :to="`/docs/${nextChapter.slug}`" class="docs-pager-link">
            {{ nextChapter.title[locale] }} →
          </NuxtLink>
        </nav>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Globe from '@primeicons/vue/globe'
import { DOC_CHAPTERS, type DocLocale } from '~/data/docs'

// 公开文档：/docs 与 /docs/{chapter}；左侧目录、右侧正文，中英文切换记忆在 localStorage
definePageMeta({
  validate: (route) => {
    const raw = route.params.slug
    const slug = Array.isArray(raw) ? raw[0] : raw
    return !slug || DOC_CHAPTERS.some(chapter => chapter.slug === slug)
  }
})

const DOCS_LOCALE_KEY = 'bits-docs-locale'
const chapters = DOC_CHAPTERS

const route = useRoute()
const slugParam = computed(() => {
  const raw = route.params.slug
  return Array.isArray(raw) ? raw[0] : raw
})

const chapterIndex = computed(() => {
  if (!slugParam.value) return 0
  return chapters.findIndex(chapter => chapter.slug === slugParam.value)
})

const chapter = computed(() => chapters[chapterIndex.value] ?? chapters[0]!)
const prevChapter = computed(() => (chapterIndex.value > 0 ? chapters[chapterIndex.value - 1] : null))
const nextChapter = computed(() =>
  chapterIndex.value < chapters.length - 1 ? chapters[chapterIndex.value + 1] : null
)

function chapterNumber(index: number) {
  return String(index + 1).padStart(2, '0')
}

const locale = ref<DocLocale>('en')

onMounted(() => {
  try {
    const saved = localStorage.getItem(DOCS_LOCALE_KEY)
    if (saved === 'en' || saved === 'zh') locale.value = saved
  } catch {
    // localStorage 不可用时保持默认英文
  }
})

function setLocale(next: DocLocale) {
  locale.value = next
  try {
    localStorage.setItem(DOCS_LOCALE_KEY, next)
  } catch {
    // 忽略存储失败，仅当前会话生效
  }
}

useHead({
  title: () => `${chapter.value.title[locale.value]} · Docs`,
  meta: [
    { name: 'description', content: () => chapter.value.summary[locale.value] },
    { name: 'robots', content: 'index, follow' }
  ],
  htmlAttrs: { lang: computed(() => (locale.value === 'zh' ? 'zh-CN' : 'en')) }
})
</script>

<style scoped lang="scss">
.docs-page {
  width: min(1180px, 94vw);
  margin: 0 auto;
  padding: 2.75rem 0 6rem;
}

.docs-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  padding-bottom: 1.75rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.docs-eyebrow {
  margin: 0 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.docs-heading {
  margin: 0;
  font-size: clamp(1.8rem, 3.5vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.docs-sub {
  margin: 0.45rem 0 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.docs-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding-top: 0.15rem;
  color: var(--p-text-muted-color);
  font-size: 0.82rem;
  white-space: nowrap;
}

.docs-lang-icon {
  width: 0.95rem;
  height: 0.95rem;
  opacity: 0.55;
}

.docs-lang-option {
  padding: 0;
  border: 0;
  background: none;
  color: var(--p-text-muted-color);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: var(--p-text-color);
  }

  &.is-active {
    color: var(--p-text-color);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
}

.docs-lang-sep {
  opacity: 0.4;
}

.docs-layout {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 3rem;
  align-items: start;
  margin-top: 2rem;
}

.docs-side {
  position: sticky;
  top: 1.5rem;
}

.docs-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.docs-nav-item {
  display: flex;
  gap: 0.6rem;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  color: var(--p-text-muted-color);
  font-size: 0.86rem;
  line-height: 1.4;
  text-decoration: none;

  &:hover {
    background: color-mix(in srgb, var(--p-text-color) 6%, transparent);
    color: var(--p-text-color);
  }

  &.is-active {
    background: color-mix(in srgb, var(--p-text-color) 10%, transparent);
    color: var(--p-text-color);
    font-weight: 600;
  }
}

.docs-nav-num {
  padding-top: 0.14rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  opacity: 0.55;
}

.docs-main {
  min-width: 0;
}

.docs-article {
  max-width: 780px;
}

.docs-article-title {
  margin: 0;
  font-size: clamp(1.5rem, 2.8vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.docs-article-summary {
  margin: 0.45rem 0 1.5rem;
  font-size: 0.92rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
}

.docs-h2 {
  margin: 2rem 0 0.6rem;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.docs-p {
  margin: 0 0 1rem;
  font-size: 0.92rem;
  line-height: 1.8;
}

.docs-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0 0 1rem;
  padding-left: 1.3rem;
  font-size: 0.92rem;
  line-height: 1.75;
}

.docs-code {
  margin: 0 0 1rem;
  padding: 0.8rem 1rem;
  overflow-x: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  background: color-mix(in srgb, var(--p-text-color) 3%, transparent);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  line-height: 1.65;
}

.docs-note {
  margin: 0 0 1rem;
  padding: 0.6rem 0.8rem;
  border-left: 2px solid #d97706;
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, #d97706 8%, transparent);
  font-size: 0.86rem;
  line-height: 1.7;
}

.docs-table-wrap {
  margin: 0 0 1rem;
  overflow-x: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th,
  td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--p-content-border-color);
  }

  th {
    background: color-mix(in srgb, var(--p-text-color) 3%, transparent);
    font-weight: 600;
  }

  tr:last-child td {
    border-bottom: 0;
  }
}

.docs-pager {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  max-width: 780px;
  margin-top: 2.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-content-border-color);
}

.docs-pager-link {
  color: inherit;
  font-size: 0.85rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

@media (max-width: 900px) {
  .docs-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .docs-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .docs-side {
    position: static;
    min-width: 0;
  }

  .docs-nav {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.4rem;
  }

  .docs-nav-item {
    white-space: nowrap;
  }
}
</style>
