<template>
  <div class="settings">
    <aside class="settings-sidebar">
      <h1 class="settings-heading">Settings</h1>
      <nav class="settings-nav" aria-label="Account settings">
        <NuxtLink v-for="item in sections" :key="item.to" :to="item.to" class="nav-item">
          <component :is="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <ExclamationTriangle v-if="item.warn" class="nav-warn" aria-label="Action required" />
        </NuxtLink>
      </nav>
    </aside>

    <div class="settings-content">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'
import User from '@primeicons/vue/user'
import Folder from '@primeicons/vue/folder'
import Shield from '@primeicons/vue/shield'
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'

const { user: authUser } = useAuthUser()

// 登录守卫（所有子路由共用）：未登录跳转 /sign
const { data } = await useFetch<{ user: AuthUser }>('/api/auth/me')
if (data.value?.user) {
  authUser.value = data.value.user
} else {
  await navigateTo('/sign')
}

// warn：待办提醒（用户名未设置 / 密码未设置）
const sections = computed(() => [
  { label: 'Account', to: '/account/profile', icon: User, warn: !authUser.value?.usernameSet },
  { label: 'Login Security', to: '/account/security', icon: Shield, warn: !authUser.value?.hasPassword },
  { label: 'Content Management', to: '/account/content', icon: Folder, warn: false }
])
</script>

<!-- 非 scoped：子路由页面复用本页的卡片/行样式（均在 .settings 作用域内） -->
<style lang="scss">
.settings {
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

  /* ---------- Sidebar ---------- */
  .settings-heading {
    margin: 0 0 1rem 0.7rem;
    font-size: 1.3rem;
    font-weight: 600;
  }

  .settings-nav {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
    color: var(--p-text-color);
    font-size: 0.95rem;
    text-decoration: none;

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

  /* 待办提醒（用户名 / 密码未设置） */
  .nav-warn {
    margin-left: auto;
    width: 1em;
    height: 1em;
    color: var(--p-orange-500);
    flex-shrink: 0;
  }

  /* ---------- Content（子路由页面复用） ---------- */
  .section-title {
    margin: 0 0 1.75rem;
    font-size: 1.15rem;
    font-weight: 600;
  }

  .group {
    margin-bottom: 2rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .group-title {
    margin: 0 0 0.6rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--p-text-muted-color);
  }

  .card {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--panel);
    overflow: hidden;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1rem 1.15rem;

    & + .row {
      border-top: 1px solid var(--border);
    }
  }

  .row-main {
    min-width: 0;
  }

  .row-label {
    display: block;
    font-size: 0.92rem;
    font-weight: 500;
  }

  .row-desc {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.82rem;
    color: var(--p-text-muted-color);
  }

  .row-control {
    flex-shrink: 0;
  }

  .row-value {
    font-size: 0.9rem;
    color: var(--p-text-muted-color);
  }

  .control-input {
    width: 220px;
  }

  .avatar-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .avatar {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--active);
    border: 1px solid var(--border);
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  @media screen and (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.75rem;
    padding-top: 1.75rem;

    .settings-heading {
      margin-left: 0;
    }

    .settings-nav {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .control-input {
      width: 100%;
    }
  }
}
</style>
