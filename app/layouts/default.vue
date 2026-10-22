<template>
    <header class="site-header">
        <nav class="navbar" aria-label="主导航">
            <BrandLogo class="header-brand" :active="loaderDone" />
            <div class="nav-actions">
                <NuxtLink to="/docs" class="docs-trigger" aria-label="Documentation">
                    <Book aria-hidden="true" />
                    <span class="docs-trigger-label">Docs</span>
                </NuxtLink>
                <!-- 指令框入口：点击打开；按钮内的 / 提示快捷键（首页由 hero 输入框承担，不重复显示） -->
                <button v-if="route.path !== '/'" type="button" class="command-trigger"
                    aria-label="Open command box (press slash)" aria-keyshortcuts="/"
                    title="Press / to open the command box" @click="openCommands">
                    <Search aria-hidden="true" />
                    <span class="command-trigger-label">Commands</span>
                    <kbd class="command-trigger-key" aria-hidden="true">/</kbd>
                </button>
                <Button as="a" class="github-link" severity="secondary" rounded :href="githubUrl" target="_blank"
                    rel="noopener noreferrer">
                    <Github aria-hidden="true" />
                    <span>{{ starLabel }} Stars</span>
                </Button>
                <!-- 已登录用扁平文本按钮（无背景）；未登录仍是填充式登录按钮 -->
                <Button as-child v-slot="slotProps" :text="!!authUser" :severity="authUser ? 'secondary' : undefined">
                    <NuxtLink :to="authUser ? (authUser.usernameSet ? `/${authUser.username}` : '/account/profile') : '/sign'"
                        :class="[slotProps.class, 'auth-button', { 'auth-button--account': !!authUser }]"
                        v-bind="slotProps.a11yAttrs">
                        <!-- 已登录：GitHub 头像 + 昵称 + 右上箭头（提示可进入账户页） -->
                        <template v-if="authUser">
                            <UserAvatar :src="authUser.githubAvatarUrl" :size="22" />
                            <span class="auth-name">{{ authUser.nickname }}</span>
                            <ArrowUpRight class="auth-arrow" aria-hidden="true" />
                        </template>
                        <template v-else>Log In / Sign Up</template>
                    </NuxtLink>
                </Button>
            </div>
        </nav>
    </header>
    <main>
        <slot></slot>
    </main>
    <!-- 全站目录指令框：任意站点页面按 / 或点顶栏入口唤起（首页 hero 搜索框也支持 /） -->
    <SiteCommandPalette ref="palette" />
</template>
<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuthUser'

const route = useRoute()
import Book from '@primeicons/vue/book'
import Github from '@primeicons/vue/github'
import Search from '@primeicons/vue/search'
import ArrowUpRight from '@primeicons/vue/arrow-up-right'
const githubUrl = 'https://github.com/Micropue/micropue-bits-service'
import Button from 'primevue/button'
const { data } = useFetch<{ stars: number | null }>('/api/github/star')

// 顶栏指令入口
const palette = ref<{ open: () => void } | null>(null)
function openCommands() {
    palette.value?.open()
}

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
            gap: 0.75rem;

            .docs-trigger {
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                height: 36px;
                padding: 0 0.7rem;
                border: 1px solid var(--p-content-border-color);
                border-radius: 999px;
                color: var(--p-text-muted-color);
                font-size: 0.85rem;
                text-decoration: none;
                transition: border-color 0.15s, color 0.15s;

                &:hover,
                &:focus-visible {
                    border-color: var(--p-primary-color);
                    color: var(--p-text-color);
                }

                &.router-link-active {
                    border-color: color-mix(in srgb, var(--p-primary-color) 45%, var(--p-content-border-color));
                    color: var(--p-text-color);
                }

                svg {
                    width: 1rem;
                    height: 1rem;
                }
            }

            .command-trigger {
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                height: 36px;
                padding: 0 0.7rem;
                border: 1px solid var(--p-content-border-color);
                border-radius: 999px;
                background: transparent;
                color: var(--p-text-muted-color);
                font: inherit;
                font-size: 0.85rem;
                cursor: pointer;
                transition: border-color 0.15s, color 0.15s;

                &:hover,
                &:focus-visible {
                    border-color: var(--p-primary-color);
                    color: var(--p-text-color);
                }

                svg {
                    width: 1rem;
                    height: 1rem;
                }

                kbd {
                    padding: 0 0.3rem;
                    border: 1px solid var(--p-content-border-color);
                    border-radius: 0.3rem;
                    font: inherit;
                    font-size: 0.72rem;
                    line-height: 1.5;
                }
            }

            .auth-button--account {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding-block: 0.35rem;
            }

            .auth-name {
                max-width: 9rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-weight: 500;
            }

            .auth-arrow {
                width: 0.8rem;
                height: 0.8rem;
                opacity: 0.7;
            }

            .github-link {
                width: fit-content;

                svg {
                    width: 1.5em !important;
                    height: 1.5em !important;
                }

                display: flex;
                align-items: center;
                font-size: 1em;
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

    /* 窄屏：指令 / 文档入口只留图标，并做成正圆；账户入口只留头像与箭头 */
    @media screen and (max-width: 700px) {
        .nav-actions .command-trigger-label,
        .nav-actions .docs-trigger-label {
            display: none;
        }

        .nav-actions .command-trigger,
        .nav-actions .docs-trigger {
            justify-content: center;
            width: 36px;
            padding: 0;
            border-radius: 50%;
        }

        .nav-actions .command-trigger-key {
            display: none;
        }
    }

    @media screen and (max-width: 560px) {
        .nav-actions .auth-name {
            display: none;
        }
    }
}

main {
    height: calc(100% - 80px);
}
</style>
