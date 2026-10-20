<template>
  <div class="home">
    <div class="wall-bg" inert>
      <DriftWall
        :columns="10"
        :tile-width="200"
        :tile-height="132"
        :gap="18"
        :tilt="40"
        :turn="0"
        :roll="0"
        :perspective="1200"
        :depth="120"
        :speed="28"
        :variance="0.45"
        :fade="0.6"
        :dim="0.55"
        grayscale
        overlay-color="var(--p-content-background)"
        @ready="backgroundReady = true"
      />
      <div class="wall-fade" aria-hidden="true" />
      <div class="wall-fade-left" aria-hidden="true" />
      <div class="wall-fade-right" aria-hidden="true" />
    </div>

    <div class="hero-section" :inert="!backgroundReady">
      <LayoutGroup>
        <motion.h1 class="hero" layout :class="{ 'hero--hidden': searchFocused }" :aria-hidden="searchFocused">
          <motion.span layout :transition="{ type: 'spring', damping: 30, stiffness: 400 }">
            Make Your Code
          </motion.span>
          <RotatingText main-class-name="rotating-chip" split-level-class-name="rt-split"
            :texts="['Shareable', 'Reusable', 'Discoverable']" stagger-from="last" :initial="{ y: '100%' }"
            :animate="{ y: 0 }" :exit="{ y: '-120%' }" :stagger-duration="0.025"
            :transition="{ type: 'spring', damping: 30, stiffness: 400 }" :rotation-interval="2000" />
        </motion.h1>
      </LayoutGroup>

      <!-- 浮起时用同高度的占位撑住文档流，避免下方内容上移 -->
      <div class="search-slot" :style="searchFocused ? { height: `${searchSlotHeight}px` } : undefined">
        <motion.div
          class="search-box"
          :class="{ 'search-box--floating': searchFocused }"
          layout="position"
          :transition="{ type: 'spring', damping: 30, stiffness: 400 }"
          @click="focusInput"
          @mousedown="onSearchMouseDown"
          @focusin="onSearchFocusIn"
          @focusout="onSearchFocusOut"
        >
        <!-- 选定指令后的彩色标记（退格一次删除整条）；未选指令时斜杠在输入框里 -->
        <span v-if="command" class="command-prefix" aria-hidden="true">{{ prefix }}</span>
        <input id="home-search" ref="inputEl" v-model="text" class="search-input" type="text" name="q"
          :placeholder="placeholder" role="combobox" aria-autocomplete="list" aria-label="Catalog command"
          :aria-expanded="showPalette" :aria-controls="listId" :aria-activedescendant="activeOptionId"
          @keydown.space="handleSpace"
          @keydown.delete="handleBackspace"
          @keydown.down="onArrow($event, 1)"
          @keydown.up="onArrow($event, -1)"
          @keydown.enter="onEnter"
          @keydown.esc.prevent="onEscape"
          @paste="handlePaste" />

          <CatalogCommandList v-if="showPalette" v-model:active-index="activeIndex" :mode="mode"
            :commands="commandMatches" :results="results" :list-id="listId" :loading="resultsLoading"
            :empty-text="emptyText" @pick-command="setCommand" @pick-item="go" />
        </motion.div>
      </div>
    </div>

    <Transition name="page-loader" @leave="loaderDone = true">
      <div v-if="!backgroundReady" class="page-loader" role="status" aria-live="polite" aria-label="Loading">
        <ProgressSpinner />
      </div>
    </Transition>

    <!-- 代码片段墙：左右循环滚动 -->
    <SnippetMarquee />
    <!-- 数量统计 + 按用途浏览 -->
    <HomeHighlights />
  </div>

  <!-- 页脚只在首页：内容层抬到它之上，滚动到底部时逐渐露出 -->
  <SiteFooter />
</template>

<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import type { CatalogCommandDef } from '~/composables/useCatalogCommand'

const backgroundReady = ref(false)
const searchFocused = ref(false)

// LOGO 入场动画在布局里监听：遮罩开始淡出时播放（进入首页每次重播）
const loaderDone = useState('loader-done', () => true)
loaderDone.value = false

useHead({ title: 'Make Your Code Shareable' })

const command = ref<CatalogCommandDef | null>(null)
const text = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const searchSlotHeight = ref(0)

// 指令框（逻辑见 useCatalogCommand）：选中指令后是「彩色标记 + 参数输入」
const {
  listId, mode, prefix, placeholder, commandMatches, results, resultsLoading, activeIndex, activeList,
  emptyText, setCommand, handleSpace, handleBackspace, handlePaste, move, choose, go, dispose
} = useCatalogCommand(command, text, {
  idPrefix: 'home-command',
  focusInput: () => inputEl.value?.focus()
})

const showPalette = computed(() => searchFocused.value)
const activeOptionId = computed(() =>
  showPalette.value && activeList.value.length ? `${listId}-${activeIndex.value}` : undefined)

function onArrow(event: KeyboardEvent, delta: number) {
  if (!showPalette.value || !activeList.value.length) return
  event.preventDefault()
  move(delta)
}

function onEnter(event: KeyboardEvent) {
  if (!showPalette.value) return
  event.preventDefault()
  choose()
}

function onEscape() {
  if (command.value || text.value) {
    command.value = null
    text.value = ''
    return
  }
  inputEl.value?.blur()
}

// 全局 /：不在输入框内时聚焦搜索框，直接开始输入指令名
function onGlobalSlash(event: KeyboardEvent) {
  if (!isSlashShortcut(event) || isEditableTarget(event.target)) return
  event.preventDefault()
  command.value = null
  text.value = '/'
  inputEl.value?.focus()
}

onMounted(() => window.addEventListener('keydown', onGlobalSlash))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalSlash)
  dispose()
})

function focusInput() {
  inputEl.value?.focus()
}

// 点击输入框以外的盒子区域（内边距/标签）时阻止默认聚焦行为，
// 避免输入框失焦再重获焦导致上浮动画闪回
function onSearchMouseDown(event: MouseEvent) {
  if (event.target !== inputEl.value) event.preventDefault()
}

function onSearchFocusIn() {
  // 浮起前先量高度，交给占位容器撑住文档流
  // （motion.div 的模板 ref 是组件实例，这里从输入框反查真实的盒子高度）
  if (!searchFocused.value) {
    const box = inputEl.value?.closest('.search-box') as HTMLElement | null
    searchSlotHeight.value = box?.offsetHeight ?? 0
  }
  searchFocused.value = true
}

// 焦点仍在盒子内（如标签按钮）时不收起
function onSearchFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (next && (event.currentTarget as HTMLElement).contains(next)) return
  searchFocused.value = false
}
</script>

<style scoped>
.home {
  /* 抬到固定在底部的页脚之上，背景要实心才能盖住它 */
  position: relative;
  z-index: 1;
  background: var(--p-content-background);
  /* 至少铺满 header 以下的视口，否则页脚会从底部漏出来 */
  min-height: calc(100vh - 70px);
  padding: 18vh 1.5rem 0;
}

.wall-bg {
  position: absolute;
  inset: 0 0 auto 0;
  height: 85vh;
  max-height:1080px;
  pointer-events: none;
  max-width: 1920px;
  margin: auto;
}

/* 背景就绪前盖住整页（含背景墙），就绪后淡出 */
.page-loader {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  background: var(--p-content-background);
}

.page-loader :deep(.p-progressspinner) {
  width: 44px;
  height: 44px;
}

.page-loader-leave-active {
  transition: opacity 0.5s ease;
}

.page-loader-leave-to {
  opacity: 0;
}

.wall-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 30%, var(--p-content-background) 70%);
}
.wall-fade-left {
  position: absolute;
  right: 0;
  height: 100%;
  width: 30%;
  top: 0;
  background: linear-gradient(to right, transparent 30%, var(--p-content-background) 70%);
}

.wall-fade-right {
  position: absolute;
  left:0;
  height: 100%;
  width: 30%;
  top: 0;
  background: linear-gradient(to left, transparent 30%, var(--p-content-background) 70%);
}

.hero-section {
  position: relative;
  z-index: 1;
  width: min(900px, 92vw);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  align-items: center;

  .hero {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.25em;
    max-width: 100%;
    font-size: clamp(2rem, 6vw, 4rem);
    font-weight: 700;
    margin: 0;
    transition: opacity 0.35s ease;

    /* 标题不换行；放不下时让后面的动态单词整体落到第二行 */
    > span {
      white-space: nowrap;
    }
  }

  .hero--hidden {
    opacity: 0;
  }

  /* 窄屏：标题独占一行，动态单词整体落到第二行居中 */
  @media (max-width: 480px) {
    .hero > span:first-child {
      flex-basis: 100%;
      text-align: center;
    }
  }

  .special {
    font-family: 'Dancing Script';
  }
}

.search-slot {
  width: 100%;
}

.search-box {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  background: var(--p-content-background);
  cursor: text;
  transition: border-color 0.15s;
}

.search-box:focus-within {
  border-color: var(--p-primary-color);
}

/* 聚焦后固定到导航栏（70px）下方 */
.search-box--floating {
  position: fixed;
  top: 84px;
  left: 0;
  right: 0;
  margin-inline: auto;
  width: min(900px, 92vw);
  z-index: 5;
  box-shadow: 0 12px 32px -14px rgba(0, 0, 0, 0.35);
}

.search-input {
  flex: 1 1 8rem;
  min-width: 8rem;
  padding: 0.25rem 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1.15rem;
}

/* 指令标记与 hero 输入框同字号 */
.command-prefix {
  font-size: 1.15rem;
}

</style>
