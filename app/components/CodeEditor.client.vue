<template>
  <div ref="host" class="code-editor" :style="{ '--editor-height': `${height}px` }" />
</template>

<script setup lang="ts">
// CodeMirror 6 编辑器（纯编辑，无预览；语法高亮随语言与深浅色切换）
// 语言包按需动态加载（@codemirror/language-data），主包不打包 100+ 种语法
const props = withDefaults(defineProps<{
  modelValue: string
  /** 语言展示名（如 TypeScript），用于匹配 CodeMirror 语言包 */
  language?: string
  placeholder?: string
  /** 编辑区高度（px），移动端会降到 280 */
  height?: number
}>(), {
  language: '',
  placeholder: 'Paste your code here…',
  height: 360
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const host = ref<HTMLElement | null>(null)

let view: import('@codemirror/view').EditorView | null = null
let languageCompartment: import('@codemirror/state').Compartment | null = null
let themeCompartment: import('@codemirror/state').Compartment | null = null
let languageData: import('@codemirror/language').LanguageDescription[] = []
let darkQuery: MediaQueryList | null = null
let loadSeq = 0

function isDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

async function loadLanguageSupport(viewRef: import('@codemirror/view').EditorView, name: string) {
  const seq = ++loadSeq
  const { LanguageDescription } = await import('@codemirror/language')
  const description = name
    ? LanguageDescription.matchLanguageName(languageData, name, true)
    : null
  const support = description ? await description.load() : []
  if (seq !== loadSeq || !view || !languageCompartment) return
  viewRef.dispatch({ effects: languageCompartment.reconfigure(support) })
}

onMounted(async () => {
  if (!host.value) return

  const { EditorView, keymap, placeholder } = await import('@codemirror/view')
  const { EditorState, Compartment } = await import('@codemirror/state')
  const { basicSetup } = await import('codemirror')
  const { indentWithTab } = await import('@codemirror/commands')
  const { oneDark } = await import('@codemirror/theme-one-dark')
  const languageModule = await import('@codemirror/language-data')
  languageData = languageModule.languages

  languageCompartment = new Compartment()
  themeCompartment = new Compartment()

  // 与站点一致：透明底 + 主题文字色；深色用 One Dark 的语法配色
  const baseTheme = EditorView.theme({
    '&': { backgroundColor: 'transparent', color: 'var(--p-text-color)', fontSize: '0.82rem' },
    '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '0.65rem 0' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.65' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid var(--p-content-border-color)',
      color: 'var(--p-text-muted-color)'
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--p-text-color) 4%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--p-text-color)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--p-primary-color) 24%, transparent)'
    }
  })

  // One Dark 自带背景，这里覆盖成透明以贴合页面卡片
  const darkOverrides = EditorView.theme({
    '&': { backgroundColor: 'transparent' },
    '.cm-gutters': { backgroundColor: 'transparent', borderRight: '1px solid var(--p-content-border-color)' },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.045)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' }
  })

  const themeExtensions = () => (isDark() ? [oneDark, darkOverrides] : [baseTheme])

  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        baseTheme,
        themeCompartment.of(themeExtensions()),
        languageCompartment.of([]),
        keymap.of([indentWithTab]),
        EditorView.contentAttributes.of({ id: 'snippet-code-editor', name: 'code', 'aria-label': 'Code editor' }),
        placeholder(props.placeholder),
        EditorView.updateListener.of(update => {
          if (update.docChanged) emit('update:modelValue', update.state.doc.toString())
        })
      ]
    })
  })

  // 深浅色切换：只需重配主题
  darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const onScheme = () => {
    if (view && themeCompartment) view.dispatch({ effects: themeCompartment.reconfigure(themeExtensions()) })
  }
  darkQuery.addEventListener('change', onScheme)

  await loadLanguageSupport(view, props.language)
})

// 外部值变化（重置/切换草稿）时同步编辑器；避免回环
watch(() => props.modelValue, value => {
  if (!view) return
  if (value !== view.state.doc.toString()) {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }
})

watch(() => props.language, name => {
  if (view) void loadLanguageSupport(view, name)
})

onBeforeUnmount(() => {
  loadSeq++
  darkQuery = null
  view?.destroy()
  view = null
})
</script>

<style scoped lang="scss">
.code-editor {
  overflow: hidden;
  border-radius: 0.6rem;

  :deep(.cm-editor) {
    height: var(--editor-height, 360px);
  }

  :deep(.cm-scroller) {
    overflow: auto;
  }

  @media (max-width: 700px) {
    :deep(.cm-editor) {
      height: 280px;
    }
  }
}
</style>
