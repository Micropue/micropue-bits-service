<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator :height="2" style="width: 100%;" color="var(--p-text-color)" :throttle="0" :hide-delay="300" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const siteUrl = String(runtimeConfig.public.siteUrl).replace(/\/+$/, '')
const canonicalUrl = computed(() => {
  const path = route.path === '/' ? '/' : route.path.replace(/\/+$/, '')
  return `${siteUrl}${path}`
})

// 各路由用 useHead({ title: '...' }) 设置静态标题，这里统一追加站点后缀
useHead({
  titleTemplate: (title?: string | null) => (title ? `${title} | BITS` : 'BITS'),
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [{ property: 'og:url', content: canonicalUrl }],
  script: [{
    type: 'application/ld+json',
    key: 'website-jsonld',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'BITS',
      url: siteUrl,
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    })
  }]
})
</script>

<style lang="scss" scoped>
</style>
