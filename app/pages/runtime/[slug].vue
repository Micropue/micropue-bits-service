<template>
  <CatalogDetailLayout>
    <template #details>
      <CatalogEntry embedded :entry="entry" :label="label" :related="related" />
    </template>
    <template #snippets>
      <CatalogSnippets v-if="entry" :dependency="String(route.params.slug)" :subject="entry.name" />
    </template>
  </CatalogDetailLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const { entry, label, related } = await useDependencyEntry('runtime')
useCatalogHead(entry)
</script>
