<template>
  <div class="catalog-detail">
    <aside class="catalog-detail-side">
      <slot name="details" />
    </aside>
    <div class="catalog-detail-main">
      <slot name="snippets" />
    </div>
  </div>
</template>

<script setup lang="ts">
// 语言 / 依赖详情页的两栏外壳：左侧目录项详情，右侧引用它的代码段（展示 + 搜索）
defineOptions({ name: 'CatalogDetailLayout' })
</script>

<style scoped lang="scss">
.catalog-detail {
  width: min(1240px, 94vw);
  margin: 0 auto;
  padding: clamp(2.5rem, 7vh, 5rem) 0 5rem;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(2rem, 4vw, 3rem);
  align-items: start;
}

.catalog-detail-side,
.catalog-detail-main {
  min-width: 0;
}

@media (max-width: 980px) {
  .catalog-detail {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}
</style>
