<template>
  <component :is="icon" class="status-icon" aria-hidden="true" />
</template>

<script setup lang="ts">
const props = defineProps<{ status: string }>()
const icon = computed(() => statusIcon(props.status))
</script>

<style scoped>
.status-icon {
  flex: none;
  width: 0.9em;
  height: 0.9em;
  opacity: 0.8;
}
</style>
