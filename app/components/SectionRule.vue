<template>
  <div class="rule" :class="`rule--${variant}`">
    <!-- 只有文字本身可点，避免整行都成为点击区域 -->
    <NuxtLink v-if="to" :to="to" class="rule-label">{{ label }}</NuxtLink>
    <span v-else class="rule-label">{{ label }}</span>
    <!-- 清单被截断时提示还有多少没列出（"+N more"） -->
    <span v-if="hint" class="rule-hint">{{ hint }}</span>
    <span class="rule-line" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
// 索引页的分节标题：文字 + 一条延伸到右侧的分割线
// letter=首字母分组 / title=语言名（可跳转） / kind=条目类型
withDefaults(defineProps<{ label: string; to?: string; hint?: string; variant?: 'letter' | 'title' | 'kind' }>(), {
  variant: 'letter'
})
</script>

<style lang="scss" scoped>
.rule {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.rule-label {
  color: inherit;
  text-decoration: none;
}

a.rule-label:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.rule-hint {
  font-size: 0.75rem;
  white-space: nowrap;
  color: var(--p-text-muted-color);
}

.rule-line {
  flex: 1;
  height: 1px;
  background: var(--p-content-border-color);
}

.rule--letter .rule-label {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.rule--title .rule-label {
  font-size: 1.1rem;
  font-weight: 600;
}

.rule--kind .rule-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}
</style>
