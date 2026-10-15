<template>
  <NuxtLink to="/" class="brand" :class="{ 'brand--ready': ready }" aria-label="MICROPUE Bits 首页">
    <span ref="brandNameEl" class="brand-name">MICROPUE</span>
    <span class="brand-product-clip">
      <span ref="brandProductEl" class="brand-product">Bits</span>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
// 品牌 LOGO（header 与 footer 共用）：MICROPUE 逐字母从下升起（SplitText mask），随后 Bits 从单词后方向右滑入
// active 置为 true 时播放：header 等首页遮罩淡出（loader-done），footer 等自身进入视口
const props = defineProps<{ active: boolean }>()

const brandNameEl = ref<HTMLElement | null>(null)
const brandProductEl = ref<HTMLElement | null>(null)
const ready = ref(false)

let run = () => { }

// 动画资源（异步就绪后填充）；清理钩子必须同步注册，await 后再注册会脱离组件上下文
let cleanup = () => { }
onBeforeUnmount(() => cleanup())

onMounted(async () => {
  const nameEl = brandNameEl.value
  const productEl = brandProductEl.value
  if (!nameEl || !productEl) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ready.value = true
    return
  }

  const [{ default: gsap }, { SplitText }] = await Promise.all([import('gsap'), import('gsap/SplitText')])
  gsap.registerPlugin(SplitText)

  const split = SplitText.create(nameEl, { type: 'chars', mask: 'chars' })
  gsap.set(split.chars, { yPercent: 120 })
  gsap.set(productEl, { xPercent: -120 })

  const tl = gsap.timeline({ paused: true })
    .to(split.chars, { yPercent: 0, duration: 0.55, ease: 'power3.out', stagger: 0.05 })
    .to(productEl, { xPercent: 0, duration: 0.7, ease: 'power3.out' }, '-=0.25')

  run = () => {
    ready.value = true
    tl.restart()
  }

  cleanup = () => {
    tl.kill()
    split.revert()
  }

  if (props.active) run()
})

watch(() => props.active, value => {
  if (value) run()
})
</script>

<style lang="scss" scoped>
.brand {
  display: flex;
  align-items: center;
  /* 颜色由父级决定：header 用 a:not(.p-button) 的 initial，footer 继承反色文字色 */
  color: inherit;
  text-decoration: none;

  // 入场动画就绪前隐藏；JS 失败时保持可见兜底由 brand--ready 控制
  visibility: hidden;

  &.brand--ready {
    visibility: visible;
  }
}

.brand-product {
  font-family: 'Dancing Script';
  display: inline-block;
}

// 左边缘裁切：Bits 初始位于左侧被裁掉，向右滑出时像从 MICROPUE 后方出现
.brand-product-clip {
  display: inline-block;
  margin-left: 0.5em;
  clip-path: inset(-0.5em -0.5em -0.5em 0);
}
</style>
