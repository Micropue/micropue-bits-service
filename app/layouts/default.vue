<template>
    <header class="site-header">
        <nav class="navbar" aria-label="主导航">
            <BrandLogo class="header-brand" :active="loaderDone" />
            <div class="nav-actions">
                <Button as="a" class="github-link" severity="secondary" rounded :href="githubUrl" target="_blank"
                    rel="noopener noreferrer">
                    <Github aria-hidden="true" />
                    <span>{{ starLabel }} Stars</span>
                </Button>
                <Button as-child v-slot="slotProps">
                    <NuxtLink :to="authUser ? '/account' : '/sign'" :class="[slotProps.class, 'auth-button']"
                        v-bind="slotProps.a11yAttrs">{{ authUser ? 'My Account' : 'Log In / Sign Up' }}</NuxtLink>
                </Button>
            </div>
        </nav>
    </header>
    <main>
        <slot></slot>
    </main>
</template>
<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'
import Github from '@primeicons/vue/github'
const githubUrl = 'https://github.com/Micropue/micropue-bits-service'
import Button from 'primevue/button'
const { data } = useFetch<{ stars: number | null }>('/api/github/star')

const starLabel = computed(() =>
    data.value?.stars == null
        ? ''
        : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(data.value.stars))

// LOGO 入场动画的触发信号（动画本体在 BrandLogo 组件里，header 与 footer 共用）
// 默认 true：没有加载遮罩的页面（如 404）直接播放；首页在 setup 里置 false，等遮罩淡出信号
const loaderDone = useState('loader-done', () => true)

// 导航栏登录态：SSR 拉取一次（useFetch 会转发 Cookie），登录/登出后由页面更新
const { user: authUser } = useAuthUser()
const authLoaded = useState('auth-user-loaded', () => false)
if (!authLoaded.value) {
    const { data: authData } = await useFetch<{ user: AuthUser }>('/api/auth/me')
    authUser.value = authData.value?.user ?? null
    authLoaded.value = true
}
</script>
<style lang="scss" scoped>
header {
    // 页脚固定在底部（z-index: 0），导航需要显式抬升，避免窄高视口下被盖住
    position: relative;
    z-index: 2;

    height: 70px;

    a {
        text-decoration: none;
    }

    // 仅普通链接重置颜色；p-button 链接保留主题文字色
    a:not(.p-button) {
        color: initial;
    }

    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .header-brand {
        font-size: 2.4em;
    }

    nav {
        width: 90%;
        max-width: 1300px;
        display: flex;
        align-items: center;
        justify-content: space-between;

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
        .header-brand {
            font-size: 1.8em;

            :deep(.brand-name) {
                display: none;
            }
        }
    }
}

main {
    height: calc(100% - 80px);
}
</style>
