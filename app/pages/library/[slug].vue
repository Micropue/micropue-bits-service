<template>
  <CatalogEntry :entry="entry" :label="label" :related="related" />
</template>

<script setup lang="ts">
const { entry, label, related } = await useDependencyEntry('library')
useCatalogHead(entry)
</script>
