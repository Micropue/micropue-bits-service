import type { Ref } from 'vue'

// 目录指令框（主页 hero 与全站浮层共用）：输入框只接受指令
// /language(/lang) · /framework(/fw) · /lib(/library) · /tool(/tools) · /runtime(/rt, /runtimes)
// /dep(/dependency, /deps —— 跨全部依赖类型) · /user, /snippet, /group —— 公开内容搜索
// /new(/create —— 新建代码段) · /me —— 自己的主页 · /go(/page —— 站点页面)
// /followers · /following · /favorites · /feedback · /reports · /requests · /changelog —— 账户快捷入口
// 选中指令后：彩色指令标记 + 参数输入；参数为空时退格一次删除整条指令
// 关键字搜索属于后续能力（普通搜索页尚未建设），这里先不混入普通文本查询

export interface CatalogCommandDef {
  name: string
  aliases: string[]
  kind: 'language' | 'framework' | 'library' | 'tool' | 'runtime' | 'all' | 'pages' | 'action'
    | 'users' | 'snippets' | 'groups'
  noun: string
  description: string
  /** 仅 action：选中后直接跳转（/me 由代码按当前账户解析） */
  to?: string
}

export interface CatalogLookupItem {
  name: string
  logo_url?: string | null
  kind: string
  to: string
  subtitle?: string
}

interface SitePage {
  name: string
  to: string
  keywords: string
}

const SITE_PAGES: SitePage[] = [
  { name: 'Home', to: '/', keywords: 'index start' },
  { name: 'Docs', to: '/docs', keywords: 'documentation help guide usage' },
  { name: 'Changelog', to: '/changelog', keywords: 'updates release notes what is new' },
  { name: 'Languages', to: '/languages', keywords: 'language catalog' },
  { name: 'Dependencies', to: '/dependencies', keywords: 'framework library tool runtime catalog' },
  { name: 'Submit an entry', to: '/request', keywords: 'request submit language dependency' },
  { name: 'Account', to: '/account', keywords: 'profile me settings' },
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
  { name: 'user', aliases: ['u'], kind: 'users', noun: 'users', description: 'Find a user' },
  { name: 'snippet', aliases: ['s'], kind: 'snippets', noun: 'snippets', description: 'Find a public snippet' },
  { name: 'group', aliases: ['g'], kind: 'groups', noun: 'groups', description: 'Find a public group' },
  { name: 'new', aliases: ['create'], kind: 'action', noun: '', to: '/new', description: 'Create a snippet' },
  { name: 'me', aliases: ['profile'], kind: 'action', noun: '', to: '/me', description: 'Open your profile' },
  { name: 'followers', aliases: ['fans'], kind: 'action', noun: '', description: 'Open your followers' },
  { name: 'following', aliases: ['follows'], kind: 'action', noun: '', description: 'Open people you follow' },
  { name: 'favorites', aliases: ['saved', 'bookmarks'], kind: 'action', noun: '', to: '/account/favorites', description: 'Open your favorites' },
  { name: 'feedback', aliases: ['inbox'], kind: 'action', noun: '', to: '/account/activity?tab=feedback', description: 'Open feedback received' },
  { name: 'reports', aliases: ['myreports'], kind: 'action', noun: '', to: '/account/activity?tab=reports', description: 'Open your reports' },
  { name: 'requests', aliases: ['request'], kind: 'action', noun: '', to: '/account/requests', description: 'Open your catalog requests' },
  { name: 'changelog', aliases: ['updates'], kind: 'action', noun: '', to: '/changelog', description: 'Open the changelog' },
  { name: 'docs', aliases: ['help'], kind: 'action', noun: '', to: '/docs', description: 'Open documentation' },
  { name: 'account', aliases: ['settings'], kind: 'action', noun: '', to: '/account', description: 'Open account settings' },
  { name: 'security', aliases: ['2fa', 'passkey'], kind: 'action', noun: '', to: '/account/security', description: 'Open login security' },
  { name: 'go', aliases: ['page'], kind: 'pages', noun: 'pages', description: 'Jump to a page' }
]

const KIND_LABELS: Record<string, string> = {
  language: 'Language',
  framework: 'Framework',
  library: 'Library',
  tool: 'Tool',
  runtime: 'Runtime',
  all: 'Dependency',
  page: 'Page',
  user: 'User',
  snippet: 'Snippet',
  group: 'Group'
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
    if (current.kind === 'users' || current.kind === 'snippets' || current.kind === 'groups') {
      const seq = ++lookupSeq
      resultsLoading.value = true
      lookupTimer = setTimeout(async () => {
        try {
          if (current.kind === 'users') {
            const data = await $fetch<{ users: { username: string, nickname: string, avatarUrl: string | null }[] }>(
              '/api/users/search', { query: { q: query } })
            if (seq === lookupSeq) {
              results.value = data.users.map(user => ({
                name: user.nickname || user.username,
                to: `/${user.username}`,
                kind: 'user',
                logo_url: user.avatarUrl,
                subtitle: `@${user.username}`
              }))
            }
          } else if (current.kind === 'snippets') {
            const data = await $fetch<{
              snippets: { slug: string, name: string, author: { username: string }, logoUrl: string | null }[]
            }>('/api/snippets/search', { query: { q: query } })
            if (seq === lookupSeq) {
              results.value = data.snippets.map(snippet => ({
                name: snippet.name,
                to: `/${snippet.author.username}/${snippet.slug}`,
                kind: 'snippet',
                logo_url: snippet.logoUrl,
                subtitle: `@${snippet.author.username}`
              }))
            }
          } else {
            const data = await $fetch<{
              groups: { slug: string, name: string, author: { username: string }, snippetCount: number }[]
            }>('/api/groups/search', { query: { q: query } })
            if (seq === lookupSeq) {
              results.value = data.groups.map(group => ({
                name: group.name,
                to: `/${group.author.username}/${group.slug}`,
                kind: 'group',
                subtitle: `@${group.author.username} · ${group.snippetCount}`
              }))
            }
          }
        } catch {
          if (seq === lookupSeq) results.value = []
        } finally {
          if (seq === lookupSeq) resultsLoading.value = false
        }
      }, query ? 140 : 0)
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
    // action 类指令（/new、/me）不做成标记，直接跳转
    if (next.kind === 'action') {
      if (next.name === 'me') {
        const { user } = useAuthUser()
        go(user.value?.usernameSet ? `/${user.value.username}` : '/account/profile')
        return
      }
      if (next.name === 'followers' || next.name === 'following') {
        const { user } = useAuthUser()
        if (!user.value) {
          go('/sign')
          return
        }
        if (!user.value.usernameSet) {
          go('/account/profile')
          return
        }
        go(`/${user.value.username}?dialog=${next.name}`)
        return
      }
      // 收藏 / 反馈 / 举报 / 目录申请：进入个人主页下的私有子页面
      const profileSection: Record<string, string> = {
        favorites: 'favorites',
        feedback: 'feedback?tab=feedback',
        reports: 'feedback?tab=reports',
        requests: 'requests'
      }
      if (profileSection[next.name]) {
        const { user } = useAuthUser()
        if (!user.value) {
          go('/sign')
          return
        }
        if (!user.value.usernameSet) {
          go('/account/profile')
          return
        }
        go(`/${user.value.username}/${profileSection[next.name]}`)
        return
      }
      if (next.to) go(next.to)
      return
    }
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
