<template>
  <!-- 数量统计：数字为占位（公共统计接口尚未建设，内容功能上线后换成真实数据） -->
  <section class="stats" aria-label="Bits in numbers">
    <div v-for="stat in STATS" :key="stat.label" class="stat">
      <component :is="stat.icon" class="stat-icon" aria-hidden="true" />
      <span class="stat-value">{{ stat.value }}</span>
      <span class="stat-label">{{ stat.label }}</span>
    </div>
  </section>

  <!-- 按用途浏览：卡片是真实入口（语言 / 依赖页），标签只是示意 -->
  <section class="browse" aria-labelledby="browse-title">
    <header class="browse-head">
      <h2 id="browse-title" class="browse-title">Browse by what you're building</h2>
      <p class="browse-sub">
        Curated starting points for common stacks — front-end apps, APIs, tooling and runtimes.
      </p>
    </header>

    <div class="browse-grid">
      <NuxtLink v-for="group in GROUPS" :key="group.title" :to="group.to" class="browse-card">
        <div class="browse-card-head">
          <h3 class="browse-card-title">{{ group.title }}</h3>
          <ArrowUpRight class="browse-card-arrow" aria-hidden="true" />
        </div>
        <p class="browse-card-desc">{{ group.description }}</p>
        <ul class="browse-card-tags">
          <li v-for="tag in group.tags" :key="tag" class="browse-card-tag">{{ tag }}</li>
        </ul>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import Box from '@primeicons/vue/box'
import Code from '@primeicons/vue/code'
import Gift from '@primeicons/vue/gift'
import ArrowUpRight from '@primeicons/vue/arrow-up-right'

// shortcut: 统计数字是展示用占位值，等公共统计接口 / 内容功能上线后替换
const STATS = [
  { value: '1,248', label: 'Snippets shared', icon: Code },
  { value: '305', label: 'Languages and dependencies', icon: Box },
  { value: '100%', label: 'Free and open to everyone', icon: Gift }
]

const GROUPS = [
  {
    title: 'Front-end apps',
    description: 'Vue, React and TypeScript snippets for interfaces people actually use.',
    tags: ['Vue', 'React', 'TypeScript'],
    to: '/languages'
  },
  {
    title: 'Backends & services',
    description: 'Go, Rust and Python patterns for APIs that stay up.',
    tags: ['Go', 'Rust', 'Python'],
    to: '/languages'
  },
  {
    title: 'Frameworks',
    description: 'Structure for routing, state and data without reinventing it.',
    tags: ['Nuxt', 'PrimeVue', 'Svelte'],
    to: '/dependencies'
  },
  {
    title: 'Libraries',
    description: 'Small utilities that save a day of glue code.',
    tags: ['Axios', 'Zod', 'Chart.js'],
    to: '/dependencies'
  },
  {
    title: 'Tooling',
    description: 'Build, lint and ship with less friction.',
    tags: ['Vite', 'Biome', 'Docker'],
    to: '/dependencies'
  },
  {
    title: 'Runtimes',
    description: 'Where your code actually runs.',
    tags: ['Node.js', 'Deno', 'Bun'],
    to: '/dependencies'
  }
]
</script>

<style scoped lang="scss">
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  width: min(1000px, 92vw);
  margin: 7rem auto 0;
  text-align: center;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.stat-icon {
  width: 2rem;
  height: 2rem;
  color: var(--p-text-muted-color);
}

.stat-value {
  font-size: clamp(2.1rem, 4vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.stat-label {
  max-width: 12rem;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--p-text-muted-color);
}

.browse {
  width: min(1100px, 92vw);
  margin: 7rem auto 0;
  padding-bottom: 6rem;
}

.browse-head {
  max-width: 40rem;
  margin: 0 auto 2rem;
  text-align: center;
}

.browse-title {
  margin: 0;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.browse-sub {
  margin: 0.8rem auto 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--p-text-muted-color);
}

.browse-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.browse-card {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 1.35rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-content-background);
  color: inherit;
  text-decoration: none;

  &:hover .browse-card-arrow {
    color: var(--p-text-color);
  }
}

.browse-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.browse-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.browse-card-arrow {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  color: var(--p-text-muted-color);
  transition: color 0.15s ease;
}

.browse-card-desc {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--p-text-muted-color);
}

.browse-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: auto 0 0;
  padding: 0.4rem 0 0;
  list-style: none;
}

.browse-card-tag {
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }

  .browse-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .browse-grid {
    grid-template-columns: 1fr;
  }
}
</style>
