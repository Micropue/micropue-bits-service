<template>
  <div class="home">
    <div class="wall-bg" inert>
      <DriftWall
        :columns="10"
        :tile-width="200"
        :tile-height="132"
        :gap="18"
        :tilt="16"
        :turn="-14"
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
        <Button v-for="(keyword, index) in keywords" :key="keyword" severity="secondary" type="button"
          class="search-keyword" :aria-label="`Remove keyword ${keyword}`" @click.stop="removeKeyword(index)">
          {{ keyword }}
          <Times :size="14" aria-hidden="true" />
        </Button>
        <input ref="inputEl" v-model="draft" class="search-input" type="text"
          placeholder="Search code snippets, space to add keyword" aria-label="Search code snippets"
          @keydown.space="onSpace"
          @keydown.delete="onDelete"
          @paste="onPaste" />
      </motion.div>
    </div>

    <Transition name="page-loader" @leave="loaderDone = true">
      <div v-if="!backgroundReady" class="page-loader" role="status" aria-live="polite" aria-label="Loading">
        <ProgressSpinner />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import Times from '@primeicons/vue/times'

const backgroundReady = ref(false)
const searchFocused = ref(false)

// LOGO 入场动画在布局里监听：遮罩开始淡出时播放（进入首页每次重播）
const loaderDone = useState('loader-done', () => true)
loaderDone.value = false

useHead({ title: 'Make Your Code Shareable' })

const keywords = ref<string[]>([])
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

function addKeyword(word: string) {
  const keyword = word.trim()
  if (keyword && !keywords.value.includes(keyword)) keywords.value.push(keyword)
}

// 空格把当前输入升级为关键词；IME 拼音组合中不处理
function onSpace(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  addKeyword(draft.value)
  draft.value = ''
}

// 粘贴含空白的内容时自动拆分为多个关键词；单个词照常留在输入框
function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text')
  if (!text) return
  event.preventDefault()
  const input = event.target as HTMLInputElement
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length
  const combined = input.value.slice(0, start) + text + input.value.slice(end)
  if (!/\s/.test(combined)) {
    draft.value = combined
    return
  }
  combined.split(/\s+/).forEach(addKeyword)
  draft.value = ''
}

// 输入框为空时退格删除最后一个关键词
function onDelete(event: KeyboardEvent) {
  if (event.isComposing || draft.value || !keywords.value.length) return
  keywords.value.pop()
}

function removeKeyword(index: number) {
  keywords.value.splice(index, 1)
  focusInput()
}

function focusInput() {
  inputEl.value?.focus()
}

// 点击输入框以外的盒子区域（内边距/标签）时阻止默认聚焦行为，
// 避免输入框失焦再重获焦导致上浮动画闪回
function onSearchMouseDown(event: MouseEvent) {
  if (event.target !== inputEl.value) event.preventDefault()
}

function onSearchFocusIn() {
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
  position: relative;
  padding: 18vh 1.5rem 0;
}

.wall-bg {
  position: absolute;
  inset: 0 0 auto 0;
  height: 85vh;
  pointer-events: none;
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
    align-items: center;
    gap: 0.25em;
    font-size: clamp(2rem, 6vw, 4rem);
    font-weight: 700;
    margin: 0;
    transition: opacity 0.35s ease;
  }

  .hero--hidden {
    opacity: 0;
  }

  .special {
    font-family: 'Dancing Script';
  }
}

.search-box {
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

.search-keyword {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border: 0;
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.4;
  cursor: pointer;
  user-select: none;
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
</style>
