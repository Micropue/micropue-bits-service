<template>
  <div class="developer">
    <aside class="developer-sidebar">
      <h1 class="developer-heading">Developer</h1>
      <nav class="developer-nav" aria-label="Developer">
        <NuxtLink v-for="item in sections" :key="item.label" :to="item.to" class="nav-item">
          <component :is="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>

        <button type="button" class="nav-item nav-toggle" :class="{ 'is-open': docsOpen }"
          :aria-expanded="docsOpen" @click="docsOpen = !docsOpen">
          <Book aria-hidden="true" />
          <span>Docs</span>
          <ChevronDown class="nav-chevron" aria-hidden="true" />
        </button>
        <div class="developer-subnav" :class="{ 'is-open': docsOpen }" :inert="!docsOpen">
          <div class="developer-subnav-inner">
            <NuxtLink to="/developer/docs/apps" class="nav-subitem">Apps</NuxtLink>
            <NuxtLink to="/developer/docs/oauth" class="nav-subitem">OAuth</NuxtLink>
          </div>
        </div>
      </nav>
    </aside>

    <div class="developer-content">
      <NuxtPage />
    </div>

    <Toast position="bottom-right" />
  </div>
</template>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'
import Box from '@primeicons/vue/box'
import Key from '@primeicons/vue/key'
import Book from '@primeicons/vue/book'
import ChevronDown from '@primeicons/vue/chevron-down'

// 开发者入口要求账号已设置用户名、密码并开启 2FA
const route = useRoute()
const docsOpen = ref(route.path.startsWith('/developer/docs'))
watch(() => route.path, path => {
  if (path.startsWith('/developer/docs')) docsOpen.value = true
})

const { data } = await useFetch<{ user: AuthUser }>('/api/auth/me')
const current = data.value?.user
if (!current) {
  await navigateTo('/sign')
} else if (!current.usernameSet) {
  await navigateTo('/account/profile')
} else if (!current.hasPassword || !current.twoFactorEnabled) {
  await navigateTo('/account/security')
}

const sections = [
  { label: 'Apps', to: '/developer/apps', icon: Box },
  { label: 'OAuth', to: '/developer/oauth', icon: Key }
]

useHead({
  title: 'Developer',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<!-- 非 scoped：子路由页面复用开发者区的卡片/分行样式 -->
<style lang="scss">
.developer {
  --panel: color-mix(in srgb, var(--p-text-color) 4%, var(--p-content-background));
  --hover: color-mix(in srgb, var(--p-text-color) 8%, var(--p-content-background));
  --active: color-mix(in srgb, var(--p-text-color) 13%, var(--p-content-background));
  --border: var(--p-content-border-color);

  width: 90%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.75rem 0 4rem;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 3rem;
  align-items: start;
}

.developer-heading {
  margin: 0 0 1rem 0.7rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.developer-sidebar {
  position: sticky;
  top: 1.5rem;
  align-self: start;
}

.developer-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.developer-subnav {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.22s ease;
}

.developer-subnav.is-open {
  grid-template-rows: 1fr;
}

.developer-subnav-inner {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 0.1rem;
  overflow: hidden;
  padding-left: 1.1rem;
}

.developer .nav-subitem {
  display: block;
  padding: 0.4rem 0.7rem;
  border-radius: 7px;
  color: var(--p-text-muted-color);
  font-size: 0.88rem;
  text-decoration: none;

  &:hover {
    background: var(--hover);
    color: var(--p-text-color);
  }

  &.router-link-active {
    background: var(--active);
    color: var(--p-text-color);
    font-weight: 500;
  }
}

.developer .nav-toggle .nav-chevron {
  width: 0.85em;
  height: 0.85em;
  margin-left: auto;
  opacity: 0.6;
  transition: transform 0.18s ease;
}

.developer .nav-toggle.is-open .nav-chevron {
  transform: rotate(180deg);
}

.developer .nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--p-text-color);
  font-family: inherit;
  font-size: 0.95rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  svg {
    width: 1.05em;
    height: 1.05em;
    opacity: 0.85;
    flex-shrink: 0;
  }

  &:hover {
    background: var(--hover);
  }

  &.router-link-active {
    background: var(--active);
    font-weight: 500;
  }
}

.developer-content {
  min-width: 0;
}

/* 子页面共用 */
.developer .section-title {
  margin: 0 0 1.75rem;
  font-size: 1.15rem;
  font-weight: 600;
}

.developer .page-lead {
  margin: -0.75rem 0 1.5rem;
  max-width: 42rem;
  font-size: 0.88rem;
  line-height: 1.65;
  color: var(--p-text-muted-color);
}

.developer .group {
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.developer .group-title {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.developer .card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  overflow: hidden;
}

.developer .doc-card {
  padding: 1.25rem;
}

.developer .doc-card h4 {
  margin: 1.25rem 0 0.45rem;
  font-size: 0.92rem;
  font-weight: 600;

  &:first-child {
    margin-top: 0;
  }
}

.developer .doc-card p,
.developer .doc-card li {
  font-size: 0.86rem;
  line-height: 1.7;
  color: var(--p-text-muted-color);
}

.developer .doc-card p {
  margin: 0;
}

.developer .doc-card ul {
  margin: 0.35rem 0 0;
  padding-left: 1.15rem;
}

.developer .doc-card code {
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--p-text-color) 7%, transparent);
  font-family: var(--font-code);
  font-size: 0.82em;
  color: var(--p-text-color);
}

.developer .doc-card pre {
  margin: 0.6rem 0 0;
  padding: 0.75rem;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--p-text-color) 4%, var(--p-content-background));
  font-family: var(--font-code);
  font-size: 0.78rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.developer .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: var(--p-text-muted-color);

  svg {
    width: 1.6rem;
    height: 1.6rem;
    margin-bottom: 0.2rem;
    opacity: 0.6;
  }
}

.developer .empty-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.developer .empty-desc {
  margin: 0;
  max-width: 28rem;
  font-size: 0.84rem;
  line-height: 1.6;
}

@media screen and (max-width: 760px) {
  .developer {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.75rem;
    padding-top: 1.75rem;
  }

  .developer-heading {
    margin-left: 0;
  }

  .developer-sidebar {
    position: static;
  }

  .developer-nav {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
}
</style>
