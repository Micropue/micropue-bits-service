<template>
  <div class="console" :class="{ 'console--nav-open': navOpen, 'console--drawer-open': drawerOpen }">
    <div v-if="drawerOpen" class="console-scrim" @click="drawerOpen = false" />

    <aside class="console-nav" :aria-label="t('nav.overview')">
      <NuxtLink to="/dashboard" class="console-brand">
        <span class="brand-name">MICROPUE</span>
        <span class="brand-product">Bits</span>
        <span class="brand-tag">Console</span>
      </NuxtLink>

      <nav class="console-groups">
        <div v-for="group in navGroups" :key="group.labelKey" class="console-group">
          <p class="console-group-label">{{ t(group.labelKey) }}</p>
          <template v-for="item in group.items" :key="item.labelKey">
            <!-- 二级菜单（如 编程语言 / 依赖：待审核 + 已发布） -->
            <div v-if="item.children" class="console-sub">
              <button type="button" class="console-link console-link--parent"
                :class="{ 'is-open': isExpanded(item) }" :aria-expanded="isExpanded(item)" @click="toggleGroup(item)">
                <component :is="item.icon" aria-hidden="true" />
                <span>{{ t(item.labelKey) }}</span>
                <ChevronDown class="console-caret" aria-hidden="true" />
              </button>
              <!-- 用 grid-rows 0fr → 1fr 做展开/收起动画（收起时 visibility 隐藏，保持键盘不可达） -->
              <div class="console-sublist-wrap" :class="{ 'is-open': isExpanded(item) }">
                <div class="console-sublist">
                  <NuxtLink v-for="child in item.children" :key="child.to" :to="child.to"
                    class="console-link console-link--child" @click="drawerOpen = false">
                    <span>{{ t(child.labelKey) }}</span>
                  </NuxtLink>
                </div>
              </div>
            </div>
            <NuxtLink v-else-if="item.to" :to="item.to" class="console-link" @click="drawerOpen = false">
              <component :is="item.icon" aria-hidden="true" />
              <span>{{ t(item.labelKey) }}</span>
            </NuxtLink>
            <!-- 未实现的功能：先占位说明信息架构，避免点进空白页 -->
            <span v-else class="console-link console-link--soon" aria-disabled="true">
              <component :is="item.icon" aria-hidden="true" />
              <span>{{ t(item.labelKey) }}</span>
              <span class="console-tag">{{ t('nav.soon') }}</span>
            </span>
          </template>
        </div>
      </nav>
    </aside>

    <div class="console-main">
      <header class="console-topbar">
        <button type="button" class="console-icon-button" :aria-label="navToggleLabel" @click="toggleNav">
          <component :is="navToggleIcon" aria-hidden="true" />
        </button>
        <h1 class="console-title">{{ title }}</h1>

        <div class="console-actions">
          <SelectButton :model-value="locale" :options="CONSOLE_LOCALE_OPTIONS" option-label="label"
            option-value="value" size="small" :allow-empty="false" :aria-label="t('locale.label')"
            @update:model-value="setLocale" />
          <NuxtLink to="/dashboard/settings" class="console-icon-button" :aria-label="t('aria.settings')">
            <Cog aria-hidden="true" />
          </NuxtLink>
          <button type="button" class="console-avatar" :aria-label="t('aria.accountMenu')" @click="toggleMenu">
            <span class="console-avatar-initial">{{ initial }}</span>
          </button>
        </div>
      </header>

      <div class="console-content">
        <slot />
      </div>
    </div>

    <Popover ref="menuRef">
      <div class="console-menu">
        <p class="console-menu-label">{{ t('menu.signedInAs') }}</p>
        <p class="console-menu-email">{{ user?.email }}</p>
        <NuxtLink to="/dashboard/security" class="console-menu-link" @click="menuRef?.hide?.()">
          {{ t('menu.security') }}
        </NuxtLink>
        <Button :label="t('menu.signOut')" severity="secondary" text fluid :loading="signingOut" @click="onSignOut">
          <template #icon>
            <SignOut aria-hidden="true" />
          </template>
        </Button>
      </div>
    </Popover>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import Bars from '@primeicons/vue/bars'
import ChevronDown from '@primeicons/vue/chevron-down'
import ChevronLeft from '@primeicons/vue/chevron-left'
import Code from '@primeicons/vue/code'
import Cog from '@primeicons/vue/cog'
import Copy from '@primeicons/vue/copy'
import Database from '@primeicons/vue/database'
import Envelope from '@primeicons/vue/envelope'
import Flag from '@primeicons/vue/flag'
import Folder from '@primeicons/vue/folder'
import Home from '@primeicons/vue/home'
import Lock from '@primeicons/vue/lock'
import Megaphone from '@primeicons/vue/megaphone'
import Shield from '@primeicons/vue/shield'
import SignOut from '@primeicons/vue/sign-out'
import Users from '@primeicons/vue/users'

// Bits System Console 外壳：大背景 + 无背景左侧栏 + 顶栏 + 内容槽
// 窄屏（≤900px）侧栏变抽屉 + 遮罩；桌面端可整体收起；顶栏含中英文切换
const route = useRoute()
const { user, signOut } = useAdminAuth()
const { locale, t, setLocale, restoreLocale } = useConsoleI18n()
const displayName = computed(() => adminDisplayName(user.value))

interface NavItem {
  labelKey: string
  to?: string
  icon?: unknown
  children?: { labelKey: string, to: string }[]
}

const navGroups: { labelKey: string, items: NavItem[] }[] = [
  {
    labelKey: 'nav.overview',
    items: [
      { labelKey: 'nav.dashboard', to: '/dashboard', icon: Home },
      { labelKey: 'nav.security', to: '/dashboard/security', icon: Lock }
    ]
  },
  {
    labelKey: 'nav.content',
    items: [
      { labelKey: 'nav.snippets', to: '/dashboard/snippets', icon: Copy },
      { labelKey: 'nav.groups', to: '/dashboard/groups', icon: Folder }
    ]
  },
  {
    labelKey: 'nav.catalog',
    items: [
      {
        labelKey: 'nav.languages',
        icon: Code,
        children: [
          { labelKey: 'nav.pending', to: '/dashboard/languages/pending' },
          { labelKey: 'nav.published', to: '/dashboard/languages' }
        ]
      },
      {
        labelKey: 'nav.dependencies',
        icon: Database,
        children: [
          { labelKey: 'nav.pending', to: '/dashboard/dependencies/pending' },
          { labelKey: 'nav.published', to: '/dashboard/dependencies' }
        ]
      }
    ]
  },
  {
    labelKey: 'nav.community',
    items: [
      { labelKey: 'nav.reports', to: '/dashboard/reports', icon: Flag },
      { labelKey: 'nav.changelog', to: '/dashboard/changelogs', icon: Megaphone }
    ]
  },
  {
    labelKey: 'nav.system',
    items: [
      { labelKey: 'nav.accounts', to: '/dashboard/users', icon: Users },
      { labelKey: 'nav.email', to: '/dashboard/emails', icon: Envelope },
      { labelKey: 'nav.administrators', to: '/dashboard/admins', icon: Shield },
      { labelKey: 'nav.settings', to: '/dashboard/settings', icon: Cog }
    ]
  }
]

// 二级菜单展开状态：默认收起，进入子路由时自动展开；手动点击可覆盖（collapsed 优先）
const expanded = ref<string[]>([])
const collapsed = ref<string[]>([])

function routeExpands(item: NavItem) {
  return !!item.children?.some(child => route.path === child.to || route.path.startsWith(`${child.to}/`))
}

function isExpanded(item: NavItem) {
  if (collapsed.value.includes(item.labelKey)) return false
  return expanded.value.includes(item.labelKey) || routeExpands(item)
}

function toggleGroup(item: NavItem) {
  if (isExpanded(item)) {
    collapsed.value = [...new Set([...collapsed.value, item.labelKey])]
    expanded.value = expanded.value.filter(key => key !== item.labelKey)
  } else {
    collapsed.value = collapsed.value.filter(key => key !== item.labelKey)
    expanded.value = [...new Set([...expanded.value, item.labelKey])]
  }
}

const titleKeys: Record<string, string> = {
  '/dashboard': 'title.overview',
  '/dashboard/security': 'title.security',
  '/dashboard/languages': 'title.languages',
  '/dashboard/languages/pending': 'title.languagesPending',
  '/dashboard/dependencies': 'title.dependencies',
  '/dashboard/dependencies/pending': 'title.dependenciesPending',
  '/dashboard/admins': 'title.administrators',
  '/dashboard/settings': 'title.settings',
  '/dashboard/reports': 'title.reports',
  '/dashboard/changelogs': 'title.changelog',
  '/dashboard/emails': 'title.email',
  '/dashboard/auth': 'title.signIn'
}
const title = computed(() => {
  // 显式依赖语言状态，切换语言后顶栏标题立即跟随
  void locale.value
  return t(titleKeys[route.path] ?? 'title.overview')
})

// 桌面端展开始终是默认值（SSR 与客户端一致）；窄屏是否可变由 isNarrow 决定
const navOpen = ref(true)
const drawerOpen = ref(false)
const isNarrow = ref(false)

const navToggleIcon = computed(() => (isNarrow.value ? Bars : ChevronLeft))
const navToggleLabel = computed(() => {
  if (isNarrow.value) return t(drawerOpen.value ? 'aria.closeNav' : 'aria.openNav')
  return t(navOpen.value ? 'aria.collapseNav' : 'aria.expandNav')
})

function toggleNav() {
  if (isNarrow.value) drawerOpen.value = !drawerOpen.value
  else navOpen.value = !navOpen.value
}

// 抽屉在窄屏下用 CSS 媒体查询控制显示；JS 只在切换按钮上区分两种状态
let media: MediaQueryList | null = null
function syncNarrow() {
  isNarrow.value = media?.matches ?? false
  if (!isNarrow.value) drawerOpen.value = false
}

onMounted(() => {
  restoreLocale()
  media = window.matchMedia('(max-width: 900px)')
  media.addEventListener('change', syncNarrow)
  syncNarrow()
})

onBeforeUnmount(() => media?.removeEventListener('change', syncNarrow))

// 切页后收起抽屉，避免遮罩挡住新页面
watch(() => route.fullPath, () => { drawerOpen.value = false })

const initial = computed(() => (displayName.value[0] ?? 'A').toUpperCase())

const menuRef = ref<{ toggle: (event: Event) => void } | null>(null)
function toggleMenu(event: Event) {
  menuRef.value?.toggle(event)
}

// 退出登录：服务端删除当前会话（其余设备不受影响）
const signingOut = ref(false)
async function onSignOut() {
  signingOut.value = true
  try {
    await signOut()
  } catch {
    // 会话已失效同样放行，直接回登录页
  } finally {
    signingOut.value = false
    await navigateTo('/dashboard/auth')
  }
}
</script>

<!-- 头像菜单（Popover 内容会被带到 body 之外，样式必须写在 .console 之外） -->
<style lang="scss">
.console-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 13rem;
}

.console-menu-label {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

.console-menu-email {
  margin: 0;
  font-size: 0.9rem;
  word-break: break-all;
}

.console-menu-link {
  padding: 0.45rem 0.6rem;
  margin: 0 -0.6rem;
  border-radius: 8px;
  color: var(--p-text-color);
  font-size: 0.88rem;
  text-decoration: none;

  &:hover {
    background: var(--dash-hover);
    color: var(--p-text-color);
  }
}
</style>

<!-- 非 scoped：控制台各页面共用卡片/数据行样式（都在 .console 作用域内） -->
<style lang="scss">
.console {
  --nav-width: 248px;

  min-height: 100%;
  background: var(--dash-bg);
  display: grid;
  grid-template-columns: var(--nav-width) minmax(0, 1fr);
  transition: grid-template-columns 0.22s ease;

  &:not(.console--nav-open) {
    grid-template-columns: 0 minmax(0, 1fr);

    /* 收起时连内边距一起收掉，否则会留下一条 26px 的空隙；也不显示滚动条 */
    .console-nav {
      padding-left: 0;
      padding-right: 0;
      overflow: hidden;
    }
  }

  /* ---------- 左侧栏（无背景，浮在大背景上） ---------- */
  .console-nav {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    padding: 1.4rem 1rem 1.5rem;
    /* 页面滚动时侧栏固定不动（sticky + 自身可滚动），内容列独立滚动 */
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .console-brand {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0 0.6rem;
    color: var(--p-text-color);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    text-decoration: none;
    white-space: nowrap;
  }

  .brand-product {
    font-family: 'Dancing Script';
    font-weight: 600;
  }

  .brand-tag {
    /* 品牌两词按基线对齐，标签单独垂直居中，避免跟着基线往下坠 */
    align-self: center;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    border: 1px solid var(--dash-border);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--p-text-muted-color);
  }

  .console-groups {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .console-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .console-group-label {
    margin: 0 0 0.4rem;
    padding: 0 0.6rem;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--p-text-muted-color);
  }

  .console-link {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem 0.6rem;
    border-radius: 9px;
    color: var(--p-text-color);
    font-size: 0.95rem;
    text-decoration: none;
    white-space: nowrap;

    svg {
      width: 1.05em;
      height: 1.05em;
      flex-shrink: 0;
      opacity: 0.85;
    }

    &:hover {
      background: var(--dash-hover);
    }

    &.router-link-active {
      background: var(--dash-active);
      font-weight: 500;
    }
  }

  .console-link--soon {
    color: var(--p-text-muted-color);
    cursor: default;
  }

  /* 二级菜单 */
  .console-sub {
    display: flex;
    flex-direction: column;
  }

  .console-link--parent {
    width: 100%;
    border: 0;
    background: transparent;
    /* <button> 不会继承字体族，不写这行会用系统默认字体，与旁边的链接不一致
       （只取字体族，字号字重仍由 .console-link / 本规则控制） */
    font-family: inherit;
    font-weight: inherit;
    text-align: left;
    cursor: pointer;

    &.is-open .console-caret {
      transform: rotate(180deg);
    }
  }

  .console-caret {
    width: 0.9em;
    height: 0.9em;
    margin-left: auto;
    transition: transform 0.18s ease;
  }

  .console-sublist-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.24s ease;
    overflow: hidden;

    &.is-open {
      grid-template-rows: 1fr;
    }
  }

  .console-sublist {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-height: 0;
    padding: 0 0 0 1.05rem;
    overflow: hidden;
    visibility: hidden;
    transition: visibility 0s linear 0.24s;
  }

  .console-sublist-wrap.is-open .console-sublist {
    visibility: visible;
    transition-delay: 0s;
  }

  .console-link--child {
    padding: 0.4rem 0.6rem;
    font-size: 0.9rem;
    color: var(--p-text-muted-color);

    &.router-link-active,
    &.router-link-exact-active {
      background: var(--dash-active);
      color: var(--p-text-color);
      font-weight: 500;
    }
  }

  .console-tag {
    margin-left: auto;
    padding: 0.05rem 0.35rem;
    border-radius: 999px;
    border: 1px solid var(--dash-border);
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ---------- 右侧 ---------- */
  .console-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .console-topbar {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 1rem 2rem;
    background: var(--dash-bg);
  }

  .console-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .console-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .console-icon-button {
    display: grid;
    place-items: center;
    font-family: inherit;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--p-text-color);
    cursor: pointer;
    text-decoration: none;

    svg {
      width: 1.05em;
      height: 1.05em;
    }

    &:hover {
      background: var(--dash-hover);
    }
  }

  .console-avatar {
    display: grid;
    place-items: center;
    font-family: inherit;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: 1px solid var(--dash-border);
    border-radius: 50%;
    background: var(--dash-card);
    color: var(--p-text-color);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .console-scrim {
    display: none;
  }

  /* ---------- 内容区共用样式（页面直接使用） ---------- */
  .console-content {
    padding: 0.5rem 2rem 3rem;
  }

  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.25rem;
    align-items: start;
  }

  .dash-card {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    padding: 1.35rem 1.4rem 1.5rem;
    border: 1px solid var(--dash-border);
    border-radius: 16px;
    background: var(--dash-card);
  }

  .dash-card--wide {
    grid-column: 1 / -1;
  }

  .dash-card-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dash-card-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .dash-card-note {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--p-text-muted-color);
  }

  /* 统计块 */
  .dash-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .dash-stat-value {
    display: block;
    font-size: 1.85rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .dash-stat-label {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--p-text-muted-color);
  }

  /* 数据行 */
  .dash-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;

    & + .dash-row {
      padding-top: 0.85rem;
      border-top: 1px solid var(--dash-border);
    }
  }

  .dash-row-main {
    min-width: 0;
  }

  .dash-row-label {
    display: block;
    font-size: 0.92rem;
    font-weight: 500;
  }

  .dash-row-desc {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.8rem;
    color: var(--p-text-muted-color);
  }

  /* 待建设占位块 */
  .dash-placeholder {
    padding: 1.15rem;
    border: 1px dashed var(--dash-border);
    border-radius: 12px;
    font-size: 0.85rem;
    line-height: 1.65;
    color: var(--p-text-muted-color);
  }

  /* ---------- 窄屏：侧栏变抽屉 ---------- */
  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);

    &:not(.console--nav-open) {
      grid-template-columns: minmax(0, 1fr);
    }

    .console-nav {
      position: fixed;
      z-index: 5;
      top: 0;
      bottom: 0;
      left: 0;
      width: var(--nav-width);
      padding-left: 1rem;
      padding-right: 1rem;
      overflow-y: auto;
      background: var(--dash-bg);
      transform: translateX(-100%);
      transition: transform 0.22s ease;
    }

    &.console--drawer-open .console-nav {
      transform: none;
    }

    .console-scrim {
      display: block;
      position: fixed;
      z-index: 4;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
    }

    .console-topbar {
      padding: 0.85rem 1rem;
    }

    .console-content {
      padding: 0.25rem 1rem 2.5rem;
    }
  }
}
</style>
