<template>
  <div ref="host" class="code-editor"
    :class="{ 'is-readonly': readonly, 'no-gutters': !showLineNumbers }"
    :style="{ '--editor-height': `${height}px` }" />
</template>

<script setup lang="ts">
// CodeMirror 6 编辑器（纯编辑，无预览；语法高亮随语言与深浅色切换）
// 语言包按需动态加载（@codemirror/language-data），主包不打包 100+ 种语法
const props = withDefaults(defineProps<{
  modelValue: string
  /** 语言展示名（如 TypeScript），用于匹配 CodeMirror 语言包 */
  language?: string
  placeholder?: string
  /** 编辑区高度（px），移动端会降到 280；只读模式自动高度 */
  height?: number
  /** 只读展示：用于代码段详情，与编辑器共用语言解析与配色 */
  readonly?: boolean
  /** 是否显示行号（详情页隐藏） */
  showLineNumbers?: boolean
}>(), {
  language: '',
  placeholder: 'Paste your code here…',
  height: 360,
  readonly: false,
  showLineNumbers: true
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
  // ClientOnly / 表单挂载时模板 ref 可能晚一个 tick 才绑定
  await nextTick()
  if (!host.value) return

  const { EditorView, keymap, placeholder } = await import('@codemirror/view')
  const { EditorState, Compartment, Prec } = await import('@codemirror/state')
  const { basicSetup } = await import('codemirror')
  const { indentWithTab } = await import('@codemirror/commands')
  const { oneDark } = await import('@codemirror/theme-one-dark')
  const { HighlightStyle, syntaxHighlighting } = await import('@codemirror/language')
  const { tags: t } = await import('@lezer/highlight')
  const languageModule = await import('@codemirror/language-data')
  languageData = languageModule.languages

  languageCompartment = new Compartment()
  themeCompartment = new Compartment()

  // 与站点一致：透明底 + 主题文字色；深色用 One Dark 的语法配色
  const baseTheme = EditorView.theme({
    '&': { backgroundColor: 'transparent', color: 'var(--p-text-color)', fontSize: '0.82rem' },
    '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '0.65rem 0' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.7' },
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
    '&': { backgroundColor: 'transparent', color: 'var(--p-text-color)' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid var(--p-content-border-color)',
      color: 'var(--p-text-muted-color)'
    },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.045)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' }
  })

  // 与公开详情页的 .code-highlight 配色保持一致（Light / Dark 两套）
  const oneLightHighlight = HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.modifier, t.bool, t.null], color: '#a626a4' },
    { tag: [t.string, t.special(t.string), t.regexp], color: '#50a14f' },
    { tag: [t.number, t.integer, t.float], color: '#986801' },
    { tag: [t.comment, t.meta], color: '#a0a1a7', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: '#4078f2' },
    { tag: [t.typeName, t.className], color: '#c18401' },
    { tag: [t.operator, t.operatorKeyword, t.punctuation], color: '#7a7f87' },
    { tag: t.invalid, color: '#e45649' }
  ])

  const oneDarkHighlight = HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.modifier, t.bool, t.null], color: '#c678dd' },
    { tag: [t.string, t.special(t.string), t.regexp], color: '#98c379' },
    { tag: [t.number, t.integer, t.float], color: '#d19a66' },
    { tag: [t.comment, t.meta], color: '#7f848e', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: '#61afef' },
    { tag: [t.typeName, t.className], color: '#e5c07b' },
    { tag: [t.operator, t.operatorKeyword, t.punctuation], color: '#8b909a' },
    { tag: t.invalid, color: '#e06c75' }
  ])

  // 主题色板：浅色用 One Light 对齐详情页；深色保留 One Dark 背景并覆盖高亮色
  const themeExtensions = () => isDark()
    ? [baseTheme, oneDark, darkOverrides, Prec.highest(syntaxHighlighting(oneDarkHighlight))]
    : [baseTheme, Prec.highest(syntaxHighlighting(oneLightHighlight))]

  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        themeCompartment.of(themeExtensions()),
        languageCompartment.of([]),
        EditorState.readOnly.of(!!props.readonly),
        EditorView.editable.of(!props.readonly),
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

  /* 只读展示：高度随内容完整展开；隐藏光标/当前行；与详情页 pre 的内边距一致 */
  &.is-readonly {
    :deep(.cm-editor) {
      height: auto;
    }

    :deep(.cm-content) {
      padding: 1rem 1.1rem;
      font-size: 0.82rem;
    }

    :deep(.cm-activeLine),
    :deep(.cm-activeLineGutter) {
      background: transparent;
    }

    :deep(.cm-cursor) {
      display: none;
    }
  }

  &.no-gutters {
    :deep(.cm-gutters) {
      display: none;
    }
  }

  @media (max-width: 700px) {
    :deep(.cm-editor) {
      height: 280px;
    }

    &.is-readonly :deep(.cm-editor) {
      height: auto;
    }
  }
}
</style>
