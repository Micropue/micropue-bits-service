<template>
  <div class="dash-grid">
    <section class="dash-card dash-card--wide">
      <div class="dash-card-head">
        <h2 class="dash-card-title">{{ t('pending.languagesTitle') }}</h2>
        <Tag :value="t('pending.tag')" severity="secondary" rounded />
      </div>
      <div class="dash-placeholder">{{ t('pending.languagesBody') }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 语言待审核队列：审核流程尚未建设，先占位（不接数据）
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, restoreLocale } = useConsoleI18n()
onMounted(restoreLocale)

useHead({
  title: () => t('title.languagesPending'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>
