<template>
  <CatalogEntry :entry="entry" :label="label" :related="related" />
</template>

<script setup lang="ts">
const { entry, label, related } = await useDependencyEntry('runtime')
useCatalogHead(entry)
</script>
