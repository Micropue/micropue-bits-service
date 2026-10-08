<template>
  <NuxtLayout>
    <div class="error-page">
      <p class="error-code">{{ error?.statusCode ?? 500 }}</p>
      <h1 class="error-message">{{ error?.statusMessage || 'Something went wrong' }}</h1>
      <Button label="Back to Home" @click="handleBack" />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import Button from 'primevue/button'

const props = defineProps<{ error: NuxtError }>()

useHead({
  title: computed(() => `${props.error?.statusCode ?? 500} | BITS`)
})

function handleBack() {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
.error-page {
  min-height: 65vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 1.5rem;
  text-align: center;
}

.error-code {
  margin: 0;
  font-size: clamp(5rem, 16vw, 9rem);
  font-weight: 700;
  line-height: 1;
}

.error-message {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
}
</style>
