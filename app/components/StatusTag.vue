<template>
  <Tag :value="label" :severity="severity" rounded>
    <template #icon>
      <component :is="icon" />
    </template>
  </Tag>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  status?: string
  severity?: string
}>(), {
  status: '',
  severity: 'secondary'
})

const icon = computed(() => statusIcon(props.status))
</script>
