<template>
  <pre class="docs-code" tabindex="0"><code class="hljs" v-html="highlighted" /></pre>
</template>

<script setup lang="ts">
import hljs from 'highlight.js/lib/common'

const props = defineProps<{
  text: string
  language?: string
}>()

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const highlighted = computed(() => {
  const language = props.language?.toLowerCase()
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(props.text, { language }).value
  }
  return escapeHtml(props.text)
})
</script>

<style scoped lang="scss">
.docs-code {
  margin: 0.85rem 0 1.15rem;
  padding: 1rem 1.1rem;
  overflow-x: auto;
  border: 1px solid var(--p-content-border-color);
  border-radius: 10px;
  background: color-mix(in srgb, var(--p-text-color) 5%, var(--p-content-background));
  color: var(--p-text-color);
  font-family: var(--font-code);
  font-size: 0.82rem;
  line-height: 1.65;
  tab-size: 2;
}

.docs-code :deep(code) {
  display: block;
  min-width: max-content;
  font: inherit;
}

.docs-code :deep(.hljs-comment),
.docs-code :deep(.hljs-quote) {
  color: color-mix(in srgb, var(--p-text-muted-color) 82%, transparent);
  font-style: italic;
}

.docs-code :deep(.hljs-keyword),
.docs-code :deep(.hljs-selector-tag),
.docs-code :deep(.hljs-literal),
.docs-code :deep(.hljs-section),
.docs-code :deep(.hljs-link) {
  color: #c678dd;
}

.docs-code :deep(.hljs-string),
.docs-code :deep(.hljs-attr),
.docs-code :deep(.hljs-template-tag),
.docs-code :deep(.hljs-addition) {
  color: #98c379;
}

.docs-code :deep(.hljs-number),
.docs-code :deep(.hljs-symbol),
.docs-code :deep(.hljs-bullet),
.docs-code :deep(.hljs-variable),
.docs-code :deep(.hljs-template-variable) {
  color: #d19a66;
}

.docs-code :deep(.hljs-title),
.docs-code :deep(.hljs-name),
.docs-code :deep(.hljs-selector-id),
.docs-code :deep(.hljs-selector-class) {
  color: #61afef;
}

.docs-code :deep(.hljs-type),
.docs-code :deep(.hljs-built_in),
.docs-code :deep(.hljs-meta) {
  color: #56b6c2;
}

.docs-code :deep(.hljs-deletion) {
  color: #e06c75;
}
</style>
