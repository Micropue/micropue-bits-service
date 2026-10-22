<template>
  <!-- 占位：撑出与页脚等高的文档高度，滚到底部时正好把固定在底部的页脚让出来 -->
  <div ref="spacerEl" class="footer-spacer" :style="{ height: spacerHeight }" aria-hidden="true" />

  <footer ref="footerEl" class="site-footer" :class="{ 'site-footer--revealed': revealed }">
    <!-- 波浪背景：露出后挂载、不可见时暂停；线色随背景深浅调整 -->
    <Waves v-if="revealed && wavesEnabled" :paused="!onScreenVisible" :line-color="waveLineColor"
      :wave-speed-x="0.02" :wave-speed-y="0.01" :wave-amp-x="30" :wave-amp-y="15" :friction="0.9" :tension="0.01"
      :max-cursor-move="120" :x-gap="14" :y-gap="32" />

    <div class="footer-inner">
      <BrandLogo class="footer-brand" :active="revealed" />

      <nav class="sitemap" aria-label="网站地图">
        <NuxtLink v-for="(entry, index) in entries" :key="entry.name" :to="entry.to" class="sitemap-entry"
          :style="{ '--i': index }">
          {{ entry.name }}
        </NuxtLink>
      </nav>

      <div class="baseline">
        <div class="baseline-left">
          <div class="license">
            <span class="license-title">
              <Shield aria-hidden="true" />
              Apache License 2.0
            </span>
            <p class="license-text">
              Bits is open source — the project is published under the
              <a class="license-link" href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank"
                rel="noopener noreferrer">Apache License 2.0</a>.
            </p>
          </div>

          <nav class="legal" aria-label="法务信息">
            <NuxtLink v-for="item in legal" :key="item.to" :to="item.to" class="footer-link">{{ item.name }}</NuxtLink>
          </nav>
        </div>
        <div class="connect">
          <span class="connect-label">Connect:</span>
          <a class="footer-link" href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import Shield from '@primeicons/vue/shield'

// 站点页脚：固定在视口底部（z-index 0），页面内容在其上层，滚动到底部时逐渐露出
// 入场动画由视差触发：占位元素进入视口 = 页脚开始露出，此时播放 LOGO 动画并让各区块错开淡入
const footerEl = ref<HTMLElement | null>(null)
const spacerEl = ref<HTMLElement | null>(null)
const revealed = ref(false)
// JS 量测前先用样式表里的兜底高度（SSR 首屏不跳动）
const spacerHeight = ref('')

// 网站地图：只放入口，不在页脚罗列具体条目
// 新增的公开主页 / 分组入口按当前账户解析；未登录或未设置用户名时引导去设置
const { user } = useAuthUser()
const profileLink = computed(() => {
  if (!user.value) return '/sign'
  return user.value.usernameSet ? `/${user.value.username}` : '/account/profile'
})
const groupsLink = computed(() => (user.value?.usernameSet ? `/${user.value.username}#groups` : profileLink.value))
const entries = computed(() => [
  { to: '/new', name: 'New snippet' },
  { to: profileLink.value, name: 'My profile' },
  { to: groupsLink.value, name: 'Groups' },
  { to: '/docs', name: 'Docs' },
  { to: '/changelog', name: 'Changelog' },
  { to: '/account', name: 'Account' },
  { to: '/languages', name: 'Languages' },
  { to: '/dependencies', name: 'Dependencies' },
  { to: '/request', name: 'Submit an entry' }
])

// 法务入口（页面待实现，统一挂在 /legal/ 下，便于只保留一个用户名保留词）
const legal = [
  { to: '/legal/cookies', name: 'Cookies Policy' },
  { to: '/legal/terms', name: 'Legal Terms' },
  { to: '/legal/privacy', name: 'Privacy Policy' }
]

// 深色主题下页脚是比页面亮一档的浮起面板，波浪线要相应调柔（浅色主题是近黑底，用亮一档的线）
const isDark = ref(false)
const waveLineColor = computed(() => (isDark.value ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.28)'))

// 减少动态偏好下不挂载波浪；露出后挂载，滚出视口即暂停
const wavesEnabled = ref(false)
const onScreenVisible = ref(false)

let footerObserver: ResizeObserver | null = null
let revealObserver: IntersectionObserver | null = null
let darkQuery: MediaQueryList | null = null

const onSchemeChange = (event: MediaQueryListEvent) => {
  isDark.value = event.matches
}

onMounted(() => {
  const footer = footerEl.value
  if (footer) {
    // 页脚高度随宽度换行变化，量到多少占位就多高
    const syncSpacer = () => {
      spacerHeight.value = `${footer.offsetHeight}px`
    }
    syncSpacer()
    footerObserver = new ResizeObserver(syncSpacer)
    footerObserver.observe(footer)
  }

  // 主题跟随系统（PrimeVue 默认 system 模式），仅用于页脚配色
  darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  isDark.value = darkQuery.matches
  darkQuery.addEventListener('change', onSchemeChange)

  // 占位进入视口 = 页脚开始露出：一次性触发出场动画，同时持续跟踪显隐用于暂停波浪
  const spacer = spacerEl.value
  if (spacer) {
    wavesEnabled.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 阈值 1%：占位元素正好贴着视口底边（零面积相交）时不算露出，否则首屏就会判定为已露出
    revealObserver = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting)
      onScreenVisible.value = visible
      if (visible) revealed.value = true
    }, { threshold: 0.01 })
    revealObserver.observe(spacer)
  }
})

onBeforeUnmount(() => {
  footerObserver?.disconnect()
  revealObserver?.disconnect()
  darkQuery?.removeEventListener('change', onSchemeChange)
})
</script>

<style lang="scss" scoped>
/* JS 量测前的兜底高度（首屏不跳动） */
.footer-spacer {
  height: 560px;
}

.site-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;

  /* 浅色主题：近黑底（与主题色阶 zinc.950 一致） */
  background: #09090b;
  color: #fafafa;

  padding: 4rem 0 2.5rem;
}

/* 深色主题：比页面（#18181b）亮一档的浮起面板，否则页脚会与页面糊在一起 */
@media (prefers-color-scheme: dark) {
  .site-footer {
    background: #1f1f23;
  }
}

.footer-inner {
  /* 抬到波浪画布之上 */
  position: relative;
  z-index: 1;

  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  width: 90%;
  max-width: 1300px;
  margin: 0 auto;
}

.footer-brand {
  font-size: 2rem;
  /* 只占内容宽度，否则悬停/点击范围会拉满整行 */
  align-self: flex-start;
}

/* ---------- 网站地图（只放入口） ---------- */
.sitemap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem 1.5rem;
}

.sitemap-entry {
  color: inherit;
  font-size: 1.05rem;
  text-decoration: none;
  /* 网格项默认拉满整列，收缩到内容宽度 */
  justify-self: start;
}

.sitemap-entry:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* 底部一行里的邮箱链接 */
.footer-link {
  color: inherit;
  text-decoration: none;
  opacity: 0.72;
  transition: opacity 0.15s;
}

.footer-link:hover {
  opacity: 1;
}

/* ---------- 底部一行 ---------- */
.baseline {
  --i: 4;

  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem 2rem;
  padding-top: 1.75rem;
  border-top: 1px dashed color-mix(in srgb, currentColor 35%, transparent);
  font-size: 0.85rem;
}

.baseline-left {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.license {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.license-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.95rem;
  font-weight: 500;
}

.license-title svg {
  width: 1rem;
  height: 1rem;
  opacity: 0.85;
}

.license-text {
  margin: 0;
  max-width: 36rem;
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.72;
}

.license-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.license-link:hover {
  opacity: 0.8;
}

.legal {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.connect {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connect-label {
  opacity: 0.55;
}

/* ---------- 露出时错开入场 ---------- */
.sitemap-entry,
.baseline {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.5s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * 80ms);
}

.site-footer--revealed .sitemap-entry,
.site-footer--revealed .baseline {
  opacity: 1;
  transform: none;
}

@media screen and (max-width: 760px) {
  .footer-spacer {
    height: 860px;
  }

  .sitemap {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {

  .sitemap-entry,
  .baseline {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
