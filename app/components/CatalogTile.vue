<template>
  <NuxtLink :to="to" class="tile">
    <span class="tile-logo">
      <img v-if="logo_url" :src="logo_url" alt="" width="36" height="36" loading="lazy" decoding="async" />
      <!-- 无图标条目用首字母兜底 -->
      <span v-else class="tile-initial">{{ name.charAt(0) }}</span>
    </span>
    <span class="tile-name">{{ name }}</span>
    <span v-if="note" class="tile-note">{{ note }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
// 目录索引页的条目：图标在上、名称在下；note 用于检索结果里标注类型
defineProps<{ to: string; name: string; logo_url?: string | null; note?: string }>()
</script>

<style lang="scss" scoped>
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 0.5rem;
  border-radius: 14px;
  color: inherit;
  text-decoration: none;
  transition: background 0.15s;
}

.tile:hover {
  background: color-mix(in srgb, var(--p-text-color) 7%, var(--p-content-background));
}

/* LOGO 底座与着色见 main.scss 的 --logo-plate / --logo-tint（深色主题无白底、反白） */
.tile-logo {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  padding: 10px;
  border-radius: 14px;
  background: var(--logo-plate);
  box-shadow: 0 0 0 1px var(--p-content-border-color) inset;
}

.tile-logo img {
  display: block;
  width: 100%;
  height: 100%;
  filter: var(--logo-tint);
}

.tile-initial {
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--logo-ink);
}

.tile-name {
  font-size: 0.88rem;
  line-height: 1.3;
  text-align: center;
}

.tile-note {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}
</style>
