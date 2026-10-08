<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator :height="2" style="width: 100%;" color="var(--p-primary-color)" :throttle="0" :hide-delay="300" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// 各路由用 useHead({ title: '...' }) 设置静态标题，这里统一追加站点后缀
useHead({
  titleTemplate: (title?: string | null) => (title ? `${title} | BITS` : 'BITS')
})
</script>

<style lang="scss" scoped>
</style>
