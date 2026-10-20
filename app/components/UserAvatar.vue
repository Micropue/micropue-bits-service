<template>
  <span class="user-avatar" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" referrerpolicy="no-referrer" @error="failed = true">
    <Question v-else class="user-avatar-fallback" />
  </span>
</template>

<script setup lang="ts">
import Question from '@primeicons/vue/question'

// 全站统一头像：取 GitHub 头像；未绑定或加载失败时显示问号占位
// 规范见 docs-internal/项目综合设计.md「账户设置 / 头像」
const props = withDefaults(defineProps<{ src?: string | null, size?: number }>(), { src: null, size: 24 })

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>

<style scoped lang="scss">
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  border: 1px solid var(--p-content-border-color);
  background: color-mix(in srgb, var(--p-text-color) 8%, var(--p-content-background));

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* 用图标而不是文字问号：SVG 按 viewBox 居中，不受字体基线/字宽影响 */
.user-avatar-fallback {
  display: block;
  width: 58%;
  height: 58%;
  color: var(--p-text-muted-color);
}
</style>
