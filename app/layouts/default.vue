<template>
    <header class="site-header">
        <nav class="navbar" aria-label="主导航">
            <NuxtLink to="/" class="brand" :class="{ 'brand--ready': brandReady }" aria-label="MICROPUE Bits 首页">
                <span ref="brandNameEl" class="brand-name">MICROPUE</span>
                <span class="brand-product-clip">
                    <span ref="brandProductEl" class="brand-product">Bits</span>
                </span>
            </NuxtLink>
            <div class="nav-actions">
                <Button as="a" class="github-link" severity="secondary" rounded :href="githubUrl" target="_blank"
                    rel="noopener noreferrer">
                    <Github aria-hidden="true" />
                    <span>{{ starLabel }} Stars</span>
                </Button>
                <Button label="Log In / Sign Up" class="auth-button" />
            </div>
        </nav>
    </header>
    <main>
        <slot></slot>
    </main>
</template>
<script setup lang="ts">
import Github from '@primeicons/vue/github'
const githubUrl = 'https://github.com/Micropue/micropue-bits-service'
import Button from 'primevue/button'
const { data } = useFetch<{ stars: number | null }>('/api/github/star')

const starLabel = computed(() =>
    data.value?.stars == null
        ? ''
        : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(data.value.stars))

// LOGO 入场动画：MICROPUE 逐字母从下升起（SplitText mask），随后 Bits 从单词后方向右滑入。
// 等首页加载遮罩开始淡出（loader-done）才播放，避免被遮罩挡住。
const brandNameEl = ref<HTMLElement | null>(null)
const brandProductEl = ref<HTMLElement | null>(null)
const brandReady = ref(false)
// 默认 true：没有加载遮罩的页面（如 404）直接播放；首页在 setup 里置 false，等遮罩淡出信号
const loaderDone = useState('loader-done', () => true)

let play = () => { }

// 动画资源（异步就绪后填充）；清理钩子必须同步注册，await 后再注册会脱离组件上下文
let cleanup = () => { }
onBeforeUnmount(() => cleanup())

onMounted(async () => {
    const nameEl = brandNameEl.value
    const productEl = brandProductEl.value
    if (!nameEl || !productEl) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        brandReady.value = true
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

    play = () => {
        brandReady.value = true
        tl.restart()
    }

    cleanup = () => {
        tl.kill()
        split.revert()
    }

    if (loaderDone.value) play()
})

watch(loaderDone, done => {
    if (done) play()
})
</script>
<style lang="scss" scoped>
header {
    .brand {
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

    height: 70px;

    a {
        text-decoration: none;
        color: initial;
    }

    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    nav {
        width: 90%;
        max-width: 1300px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .brand-name {
            font-size: 2.4em;
        }

        .brand-product {
            font-size: 2.4em;
        }

        .nav-actions {
            display: flex;
            align-items: center;

            .github-link {
                width: fit-content;

                svg {
                    width: 1.5em !important;
                    height: 1.5em !important;
                }

                display: flex;
                align-items: center;
                font-size: 1em;
                margin-right: 2em;
            }
        }
    }

    @media screen and (max-width: 700px) {
        nav {
            .brand-name {
                font-size: 1.8em;
                display: none;
            }

            .brand-product {
                font-size: 1.8em;
            }
        }
    }
}

main {
    height: calc(100% - 80px);
}
</style>