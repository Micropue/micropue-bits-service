<template>
    <header class="site-header">
        <nav class="navbar" aria-label="主导航">
            <NuxtLink to="/" class="brand" aria-label="MICROPUE Bits 首页">
                <span class="brand-name">MICROPUE</span>
                <span class="brand-product">Bits</span>
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
</script>
<style lang="scss" scoped>
header {
    .brand-product {
        font-family: 'Dancing Script';
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
            margin-left: 0.5em;
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
                margin-left: 0.5em;
            }
        }
    }
}

main {
    height: calc(100% - 80px);
}
</style>