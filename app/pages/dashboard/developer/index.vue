<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'admin' })
await navigateTo('/dashboard/developer/apps', { replace: true })
</script>
