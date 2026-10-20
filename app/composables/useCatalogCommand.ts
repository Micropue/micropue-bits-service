import type { Ref } from 'vue'

// 目录指令框（主页 hero 与全站浮层共用）：输入框只接受指令
// /language(/lang) · /framework(/fw) · /lib(/library) · /tool(/tools) · /runtime(/rt, /runtimes)
// /dep(/dependency, /deps —— 跨全部依赖类型) · /go(/page —— 站点页面)
// 选中指令后：彩色指令标记 + 参数输入；参数为空时退格一次删除整条指令
// 关键字搜索属于后续能力（普通搜索页尚未建设），这里先不混入普通文本查询

export interface CatalogCommandDef {
  name: string
  aliases: string[]
  kind: 'language' | 'framework' | 'library' | 'tool' | 'runtime' | 'all' | 'pages'
  noun: string
  description: string
}

export interface CatalogLookupItem {
  name: string
  logo_url?: string | null
  kind: string
  to: string
}

interface SitePage {
  name: string
  to: string
  keywords: string
}

const SITE_PAGES: SitePage[] = [
  { name: 'Home', to: '/', keywords: 'index start' },
  { name: 'Languages', to: '/languages', keywords: 'language catalog' },
  { name: 'Dependencies', to: '/dependencies', keywords: 'framework library tool runtime catalog' },
  { name: 'Submit an entry', to: '/request', keywords: 'request submit language dependency' },
  { name: 'Account', to: '/account', keywords: 'profile me settings' },
  { name: 'My requests', to: '/account/requests', keywords: 'requests submissions status review' },
  { name: 'Login security', to: '/account/security', keywords: 'security password passkey github devices two-factor' },
  { name: 'Sign in', to: '/sign', keywords: 'login signup' }
]

const COMMANDS: CatalogCommandDef[] = [
  { name: 'language', aliases: ['lang'], kind: 'language', noun: 'languages', description: 'Programming language' },
  { name: 'framework', aliases: ['fw'], kind: 'framework', noun: 'frameworks', description: 'Framework' },
  { name: 'lib', aliases: ['library'], kind: 'library', noun: 'libraries', description: 'Library' },
  { name: 'tool', aliases: ['tools'], kind: 'tool', noun: 'tools', description: 'Tool' },
  { name: 'runtime', aliases: ['rt', 'runtimes'], kind: 'runtime', noun: 'runtimes', description: 'Runtime' },
  { name: 'dep', aliases: ['dependency', 'deps'], kind: 'all', noun: 'dependencies', description: 'Any dependency — framework, library, tool or runtime' },
  { name: 'go', aliases: ['page'], kind: 'pages', noun: 'pages', description: 'Jump to a page' }
]

const KIND_LABELS: Record<string, string> = {
  language: 'Language',
  framework: 'Framework',
  library: 'Library',
  tool: 'Tool',
  runtime: 'Runtime',
  all: 'Dependency',
  page: 'Page'
}

export function catalogKindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind
}

// 光标不在可输入元素里时，/ 才用于唤起指令框
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
    target.isContentEditable
}

export function isSlashShortcut(event: KeyboardEvent): boolean {
  return event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing
}

function resolveCommand(word: string): CatalogCommandDef | null {
  const value = word.trim().replace(/^\/+/, '').toLowerCase()
  return COMMANDS.find(command => command.name === value || command.aliases.includes(value)) ?? null
}

function matchPages(query: string): CatalogLookupItem[] {
  const q = query.trim().toLowerCase()
  return SITE_PAGES
    .filter(page => !q || page.name.toLowerCase().includes(q) || page.keywords.includes(q))
    .map(page => ({ name: page.name, kind: 'page', to: page.to }))
}

interface CatalogCommandOptions {
  /** DOM id 前缀（同一页面可能同时存在 hero 与浮层） */
  idPrefix?: string
  /** 选中/清除指令后把焦点放回输入框 */
  focusInput?: () => void
  /** 选中条目后的跳转（默认 navigateTo）；浮层用它在跳转前关闭 */
  onOpen?: (to: string) => void
}

export function useCatalogCommand(
  command: Ref<CatalogCommandDef | null>,
  text: Ref<string>,
  options: CatalogCommandOptions = {}
) {
  const listId = `${options.idPrefix ?? 'catalog-command'}-list`
  const focusInput = () => nextTick(() => options.focusInput?.())

  const mode = computed<'commands' | 'results'>(() => (command.value ? 'results' : 'commands'))
  const prefix = computed(() => (command.value ? `/${command.value.name}` : '/'))
  const placeholder = computed(() => (command.value ? `Search ${command.value.noun}` : 'Type / for commands'))

  const commandMatches = computed(() => {
    // 斜杠属于输入内容（按 / 唤起时会出现在输入框里），匹配时忽略
    const q = text.value.trim().replace(/^\/+/, '').toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter(item =>
      item.name.startsWith(q) || item.aliases.some(alias => alias.startsWith(q)))
  })

  const results = ref<CatalogLookupItem[]>([])
  const resultsLoading = ref(false)
  let lookupTimer: ReturnType<typeof setTimeout> | null = null
  let lookupSeq = 0

  watch([command, text], ([current, query]) => {
    if (lookupTimer) clearTimeout(lookupTimer)
    if (!current) {
      results.value = []
      resultsLoading.value = false
      return
    }
    if (current.kind === 'pages') {
      results.value = matchPages(query)
      resultsLoading.value = false
      return
    }
    const seq = ++lookupSeq
    resultsLoading.value = true
    lookupTimer = setTimeout(async () => {
      try {
        const data = await $fetch<{ items: CatalogLookupItem[] }>('/api/catalog/lookup', {
          query: { kind: current.kind, q: query }
        })
        if (seq === lookupSeq) results.value = data.items
      } catch {
        if (seq === lookupSeq) results.value = []
      } finally {
        if (seq === lookupSeq) resultsLoading.value = false
      }
    }, query ? 140 : 0)
  }, { immediate: true })

  const activeIndex = ref(0)
  const activeList = computed(() => (command.value ? results.value : commandMatches.value))
  watch([mode, text], () => { activeIndex.value = 0 })
  watch(activeIndex, index => {
    nextTick(() => document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: 'nearest' }))
  })

  const emptyText = computed(() => {
    const noun = command.value?.noun ?? 'entries'
    return `No ${noun} found${text.value.trim() ? ` for “${text.value.trim()}”` : ''}`
  })

  function setCommand(next: CatalogCommandDef) {
    command.value = next
    text.value = ''
    focusInput()
  }

  function clearCommand() {
    command.value = null
    text.value = ''
    focusInput()
  }

  // 空格：无指令时把已输入的指令名变成标记；有指令时作为普通空格（参数里可以有空格）
  function handleSpace(event: KeyboardEvent) {
    if (event.isComposing || command.value) return
    event.preventDefault()
    const resolved = resolveCommand(text.value)
    if (resolved) setCommand(resolved)
  }

  // 参数为空时退格：一次删除整条指令，输入框回到 / 以便继续输入指令
  function handleBackspace(event: KeyboardEvent) {
    if (event.isComposing || !command.value || text.value) return
    event.preventDefault()
    command.value = null
    text.value = '/'
    focusInput()
  }

  // 粘贴「/language java」这类整段指令时直接拆成标记 + 参数
  function handlePaste(event: ClipboardEvent) {
    if (command.value) return
    const raw = event.clipboardData?.getData('text') ?? ''
    const cleaned = raw.trim().replace(/^\/+/, '')
    const space = cleaned.search(/\s/)
    if (space === -1) return
    const resolved = resolveCommand(cleaned.slice(0, space))
    if (!resolved) return
    event.preventDefault()
    command.value = resolved
    text.value = cleaned.slice(space + 1).trim()
    focusInput()
  }

  function move(delta: number) {
    const length = activeList.value.length
    if (!length) return
    activeIndex.value = (activeIndex.value + delta + length) % length
  }

  function go(to: string) {
    if (options.onOpen) options.onOpen(to)
    else void navigateTo(to)
  }

  function choose() {
    if (command.value) {
      const item = results.value[activeIndex.value]
      if (item) go(item.to)
      return
    }
    const target = commandMatches.value[activeIndex.value]
    if (target) setCommand(target)
  }

  function dispose() {
    if (lookupTimer) clearTimeout(lookupTimer)
  }

  return {
    listId,
    mode,
    prefix,
    placeholder,
    commandMatches,
    results,
    resultsLoading,
    activeIndex,
    activeList,
    emptyText,
    setCommand,
    clearCommand,
    handleSpace,
    handleBackspace,
    handlePaste,
    move,
    choose,
    go,
    dispose
  }
}
