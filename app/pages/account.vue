<template>
  <div class="settings">
    <aside class="settings-sidebar">
      <h1 class="settings-heading">Settings</h1>
      <nav class="settings-nav" aria-label="Account settings">
        <template v-for="item in sections" :key="item.label">
          <!-- 二级菜单：父项点击展开/收起，进入子页面时自动展开 -->
          <div v-if="item.children" class="nav-group">
            <button type="button" class="nav-item nav-parent" :class="{ 'is-open': isExpanded(item) }"
              :aria-expanded="isExpanded(item)" @click="toggleGroup(item.label, item)">
              <component :is="item.icon" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <ExclamationTriangle v-if="item.warn" class="nav-warn" aria-label="Action required" />
              <ChevronDown class="nav-caret" aria-hidden="true" />
            </button>
            <!-- grid-rows 0fr → 1fr：展开/收起带过渡；收起时 visibility 隐藏（不可聚焦） -->
            <div class="nav-sublist-wrap" :class="{ 'is-open': isExpanded(item) }">
              <div class="nav-sublist">
                <NuxtLink v-for="child in item.children" :key="child.to" :to="child.to" class="nav-subitem">
                  {{ child.label }}
                </NuxtLink>
              </div>
            </div>
          </div>
          <NuxtLink v-else :to="item.to" class="nav-item">
            <component :is="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
            <ExclamationTriangle v-if="item.warn" class="nav-warn" aria-label="Action required" />
          </NuxtLink>
        </template>
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
import ChevronDown from '@primeicons/vue/chevron-down'

const { user: authUser } = useAuthUser()

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
  children?: { label: string, to: string }[]
}

const route = useRoute()
const expanded = ref<string[]>([])

// warn：待办提醒（用户名未设置 / 密码未设置 / 未开启两步验证）
const sections = computed<NavItem[]>(() => [
  { label: 'Account', to: '/account/profile', icon: User, warn: !authUser.value?.usernameSet },
  {
    label: 'Login Security',
    to: '/account/security',
    icon: Shield,
    warn: !authUser.value?.hasPassword || !authUser.value?.twoFactorEnabled
  },
  {
    label: 'Content Management',
    icon: Folder,
    // 原有的「代码段 / 分组 / 收藏」管理入口先撤下，这里先接入条目申请
    children: [{ label: 'Language & dependency requests', to: '/account/requests' }]
  }
])

// 进入子页面自动展开；手动点击可覆盖（collapsed 优先）
const collapsed = ref<string[]>([])

function routeExpands(item: NavItem) {
  return !!item.children?.some(child => route.path.startsWith(child.to))
}

const isExpanded = (item: NavItem) =>
  !collapsed.value.includes(item.label) && (expanded.value.includes(item.label) || routeExpands(item))

function toggleGroup(label: string, item: NavItem) {
  if (isExpanded(item)) {
    collapsed.value = [...new Set([...collapsed.value, label])]
    expanded.value = expanded.value.filter(entry => entry !== label)
  } else {
    collapsed.value = collapsed.value.filter(entry => entry !== label)
    expanded.value = [...new Set([...expanded.value, label])]
  }
}
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
    padding: 0.45rem 0.7rem;
    border-radius: 8px;
    color: var(--p-text-muted-color);
    font-size: 0.9rem;
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
