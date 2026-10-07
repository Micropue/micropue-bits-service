<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator :height="2" color="var(--p-primary-color)" :throttle="0" :hide-delay="300" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
<style lang="scss" scoped>
</style>
