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
      />
      <div class="wall-fade" aria-hidden="true" />
    </div>

    <div class="hero-section">
      <LayoutGroup>
        <motion.h1 class="hero" layout>
          <motion.span layout :transition="{ type: 'spring', damping: 30, stiffness: 400 }">
            Make Your Code
          </motion.span>
          <RotatingText main-class-name="rotating-chip" split-level-class-name="rt-split"
            :texts="['Shareable', 'Reusable', 'Discoverable']" stagger-from="last" :initial="{ y: '100%' }"
            :animate="{ y: 0 }" :exit="{ y: '-120%' }" :stagger-duration="0.025"
            :transition="{ type: 'spring', damping: 30, stiffness: 400 }" :rotation-interval="2000" />
        </motion.h1>
      </LayoutGroup>

      <div class="search-box" @click="focusInput">
        <Button v-for="(keyword, index) in keywords" :key="keyword" severity="secondary" type="button"
          class="search-keyword" :aria-label="`Remove keyword ${keyword}`" @click.stop="removeKeyword(index)">
          {{ keyword }}
          <Times :size="14" aria-hidden="true" />
        </Button>
        <input ref="inputEl" v-model="draft" class="search-input" type="text"
          placeholder="Search code snippets, space to add keyword" aria-label="Search code snippets"
          @keydown.space="onSpace" @keydown.delete="onDelete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import Times from '@primeicons/vue/times'

const keywords = ref<string[]>([])
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

// 空格把当前输入升级为关键词；IME 拼音组合中不处理
function onSpace(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  const word = draft.value.trim()
  if (word && !keywords.value.includes(word)) keywords.value.push(word)
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
