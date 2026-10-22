<template>
  <div class="settings">
    <aside class="settings-sidebar">
      <h1 class="settings-heading">Settings</h1>
      <nav class="settings-nav" aria-label="Account settings">
        <template v-for="item in sections" :key="item.label">
          <button v-if="item.needsUsername && !usernameSet" type="button" class="nav-item"
            @click="showUsernameHint">
            <component :is="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <ArrowUpRight v-if="item.outgoing" class="nav-out" aria-hidden="true" />
          </button>
          <NuxtLink v-else :to="item.to" class="nav-item">
            <component :is="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <ExclamationTriangle v-if="item.warn" class="nav-warn" aria-label="Action required" />
            <ArrowUpRight v-if="item.outgoing" class="nav-out" aria-hidden="true" />
          </NuxtLink>
        </template>
      </nav>
    </aside>

    <div class="settings-content">
      <NuxtPage />
    </div>

    <Toast position="bottom-right" />
  </div>
</template>

<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'
import User from '@primeicons/vue/user'
import Bookmark from '@primeicons/vue/bookmark'
import Flag from '@primeicons/vue/flag'
import Folder from '@primeicons/vue/folder'
import Shield from '@primeicons/vue/shield'
import ExclamationTriangle from '@primeicons/vue/exclamation-triangle'
import ArrowUpRight from '@primeicons/vue/arrow-up-right'

const { user: authUser } = useAuthUser()
const usernameSet = computed(() => authUser.value?.usernameSet ?? false)
const toast = useToast()

function showUsernameHint() {
  toast.add({
    severity: 'warn',
    summary: 'Set a username first',
    detail: 'Your public profile needs a username. Set one in Account → Profile.',
    life: 4500
  })
}

// 登录守卫（所有子路由共用）：未登录跳转 /sign
const { data } = await useFetch<{ user: AuthUser }>('/api/auth/me')
if (data.value?.user) {
  authUser.value = data.value.user
} else {
  await navigateTo('/sign')
}

interface NavItem {
  label: string
  to?: string
  icon: unknown
  warn?: boolean
  /** 公开主页入口：未设置用户名时点击只弹提示 */
  needsUsername?: boolean
  /** 跳出账户设置（公开站点页面），右侧显示右上角箭头 */
  outgoing?: boolean
}

// warn：待办提醒（用户名未设置 / 密码未设置 / 未开启两步验证）
// 内容入口与 Account 同级，不再折叠隐藏
const sections = computed<NavItem[]>(() => [
  { label: 'Account', to: '/account/profile', icon: User, warn: !usernameSet.value },
  {
    label: 'Login Security',
    to: '/account/security',
    icon: Shield,
    warn: !authUser.value?.hasPassword || !authUser.value?.twoFactorEnabled
  },
  { label: 'Favorites', to: '/account/favorites', icon: Bookmark },
  { label: 'Reports & feedback', to: '/account/activity', icon: Flag },
  { label: 'Language & dependency requests', to: '/account/requests', icon: Folder },
  {
    label: 'My profile',
    to: usernameSet.value ? `/${authUser.value?.username}` : '/account/profile',
    icon: User,
    needsUsername: true,
    outgoing: true
  }
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

  /* 页面滚动时左侧设置栏固定不动；菜单过长时自己内部滚动 */
  .settings-sidebar {
    position: sticky;
    top: 1.5rem;
    align-self: start;
    max-height: calc(100vh - 3rem);
    overflow-y: auto;
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

    .nav-out {
      width: 0.78em;
      height: 0.78em;
      margin-left: auto;
      opacity: 0.55;
    }
  }

  /* 二级菜单 */
  .nav-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .nav-parent {
    border: 0;
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    .nav-caret {
      width: 0.9em;
      height: 0.9em;
      margin-left: auto;
      opacity: 0.7;
      transition: transform 0.18s ease;
    }

    &.is-open .nav-caret {
      transform: rotate(180deg);
    }
  }

  .nav-sublist-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.24s ease;
    overflow: hidden;

    &.is-open {
      grid-template-rows: 1fr;
    }
  }

  .nav-sublist {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-height: 0;
    padding-left: 1.1rem;
    overflow: hidden;
    visibility: hidden;
    transition: visibility 0s linear 0.24s;
  }

  .nav-sublist-wrap.is-open .nav-sublist {
    visibility: visible;
    transition-delay: 0s;
  }

  .nav-subitem {
    display: block;
    width: 100%;
    padding: 0.45rem 0.7rem;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--p-text-muted-color);
    font-family: inherit;
    font-size: 0.9rem;
    text-align: left;
    text-decoration: none;
    cursor: pointer;

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

  .row-hint {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.74rem;
    line-height: 1.5;
    color: var(--p-text-muted-color);
    opacity: 0.85;
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

    /* 窄屏单列布局：侧栏回到文档流，不再吸顶 */
    .settings-sidebar {
      position: static;
      max-height: none;
      overflow: visible;
    }

    .settings-nav {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
    }

    .nav-group {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
    }

    .nav-sublist {
      flex-direction: row;
      flex-wrap: wrap;
      padding-left: 0.5rem;
    }

    .control-input {
      width: 100%;
    }
  }
}
</style>
