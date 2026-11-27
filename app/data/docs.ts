// 公开文档内容（中英双语）
// 左侧章节目录 / 右侧正文；语言在客户端切换并记忆（bits-docs-locale）
// 新增章节时同时补 en / zh 两套 blocks，键集合保持一致

export type DocLocale = 'en' | 'zh'

export type DocBlock =
  | { type: 'p', text: string }
  | { type: 'h', text: string }
  | { type: 'ul', items: string[] }
  | { type: 'ol', items: string[] }
  | { type: 'code', text: string, language?: string }
  | { type: 'note', text: string }
  | { type: 'table', headers: string[], rows: string[][] }

export interface DocChapter {
  slug: string
  title: Record<DocLocale, string>
  summary: Record<DocLocale, string>
  blocks: Record<DocLocale, DocBlock[]>
}

export const DOC_CHAPTERS: DocChapter[] = [
  {
    slug: 'getting-started',
    title: { en: 'Getting started', zh: '开始使用' },
    summary: {
      en: 'What Bits is, and how to set up your account.',
      zh: 'Bits 是什么，以及如何完成账户设置。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'Bits is a community for sharing small, reusable code snippets. Every snippet has a primary language, optional dependencies, tags and a visibility setting.' },
        { type: 'h', text: 'What you can do' },
        {
          type: 'ul',
          items: [
            'Browse languages and dependencies in the catalog.',
            'Create snippets, organize them in groups and share them on your public profile.',
            'Follow authors and find content with the command box or search.'
          ]
        },
        { type: 'h', text: 'Set up your account' },
        {
          type: 'ol',
          items: [
            'Sign in from the top-right corner.',
            'Open Account → Profile and set a username. Your username becomes your public profile URL: /{username}.',
            'Add a short bio and up to six links if you want them on your profile.'
          ]
        },
        { type: 'note', text: 'A username is required before you can publish snippets or groups as public or unlisted.' }
      ],
      zh: [
        { type: 'p', text: 'Bits 是一个分享可复用代码片段的社区。每个片段都有主要语言、可选依赖、标签和可见性设置。' },
        { type: 'h', text: '你可以做什么' },
        {
          type: 'ul',
          items: [
            '在目录中浏览编程语言与依赖。',
            '创建代码段、用分组整理，并发布到自己的公开主页。',
            '关注其他作者，通过指令框或搜索发现内容。'
          ]
        },
        { type: 'h', text: '设置账户' },
        {
          type: 'ol',
          items: [
            '从右上角登录。',
            '打开 Account → Profile 设置用户名。用户名会成为你的公开主页地址：/{username}。',
            '可选填写简介，并添加最多 6 个开放链接。'
          ]
        },
        { type: 'note', text: '发布公开或不可搜索的代码段 / 分组前，必须先设置用户名。' }
      ]
    }
  },
  {
    slug: 'snippets',
    title: { en: 'Creating snippets', zh: '创建代码段' },
    summary: {
      en: 'Use the three-step editor to publish your first snippet.',
      zh: '通过三步编辑器发布第一个代码段。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Start the editor' },
        { type: 'p', text: 'Open /new directly, or press / and choose /new in the command box.' },
        { type: 'code', language: 'bash', text: '/new' },
        { type: 'h', text: 'Three steps' },
        {
          type: 'ol',
          items: [
            'Language — pick the primary language. The dependency list is filtered by this choice.',
            'Dependencies — optional; only entries linked to the chosen language are listed.',
            'Details — add the title, description, tags, visibility, group and code.'
          ]
        },
        { type: 'p', text: 'The code editor highlights syntax based on the selected language. The URL name is generated from Name and is read-only while you create the snippet. It uses lowercase Latin letters, numbers and single hyphens (up to 40 characters). Bits checks availability as you type; if the generated URL is already used in your account, choose a different Name before publishing.' },
        {
          type: 'ul',
          items: [
            'Up to five free-form tags.',
            'At most one group per snippet.',
            'Code can be up to 1 MB (measured as UTF-8 bytes).',
            'Visibility: public, unlisted or private.'
          ]
        },
        { type: 'note', text: 'Missing a language or dependency? Use the request links under the selectors.' }
      ],
      zh: [
        { type: 'h', text: '打开编辑器' },
        { type: 'p', text: '直接访问 /new，或按 / 打开指令框后选择 /new。' },
        { type: 'code', language: 'bash', text: '/new' },
        { type: 'h', text: '三个步骤' },
        {
          type: 'ol',
          items: [
            '语言 — 选择主要语言，下一步的依赖列表会按此过滤。',
            '依赖 — 可选，只列出与该语言关联的目录条目。',
            '详情 — 填写名称、介绍、标签、可见性、分组，并粘贴代码。'
          ]
        },
        { type: 'p', text: '代码编辑器会根据所选语言高亮。URL 名由 Name 生成，在创建过程中只读；它只使用小写拉丁字母、数字和单个连字符，最长 40 个字符。Bits 会随输入检测可用性；如果生成的 URL 已被当前账户占用，请修改 Name 后再发布。' },
        {
          type: 'ul',
          items: [
            '最多 5 个自由标签。',
            '每个代码段最多属于一个分组。',
            '代码最大 1 MB（按 UTF-8 字节计算）。',
            '可见性：公开 / 不可搜索 / 私有。'
          ]
        },
        { type: 'note', text: '缺少语言或依赖？使用选择器下方的申请链接提交。' }
      ]
    }
  },
  {
    slug: 'editing',
    title: { en: 'Editing and deleting', zh: '编辑与删除' },
    summary: {
      en: 'Change a snippet after publishing, or remove it from the site.',
      zh: '发布后修改代码段，或将其从站点移除。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Edit a snippet' },
        { type: 'p', text: 'Open your profile and choose Edit on a snippet card, or open the snippet and choose Edit snippet. The editor is the same as the creation form and lives at /{username}/{slug}/edit.' },
        { type: 'p', text: 'URL name is read-only and follows Name. Leaving Name unchanged keeps the existing URL; changing Name generates a new URL and checks it for conflicts. You can also change the description, language, dependencies, tags, group, visibility and code. After saving a new URL, Bits opens the snippet at its new address. Old links, including /raw and /edit links, redirect to the new URL. Private snippets only redirect for their owner.' },
        { type: 'h', text: 'Delete a snippet' },
        { type: 'p', text: 'Use Delete on the snippet page or the edit screen, then confirm. Deleted snippets stop resolving immediately. Deletion is soft: a site administrator can restore the snippet later.' },
        { type: 'note', text: 'Deleting a group never deletes its snippets; it only removes the grouping.' }
      ],
      zh: [
        { type: 'h', text: '编辑代码段' },
        { type: 'p', text: '在个人主页的代码段卡片上点 Edit，或在代码段页面点 Edit snippet。编辑器与创建表单一致，地址为 /{username}/{slug}/edit。' },
        { type: 'p', text: 'URL 名只读，并跟随 Name 同步。Name 不变时保留原 URL；修改 Name 会生成新 URL 并检测冲突。介绍、语言、依赖、标签、分组、可见性和代码也都可以修改。保存新 URL 后，页面会跳转到新地址；旧链接（包括 /raw 和 /edit）会自动重定向。私有代码段的旧链接只对作者本人重定向。' },
        { type: 'h', text: '删除代码段' },
        { type: 'p', text: '在代码段页面或编辑页点 Delete 并确认。删除后链接立即失效。删除是软删除，站点管理员之后可以恢复。' },
        { type: 'note', text: '删除分组不会删除组内代码段，只会解除分组归属。' }
      ]
    }
  },
  {
    slug: 'groups',
    title: { en: 'Groups', zh: '代码段分组' },
    summary: {
      en: 'Organize related snippets into a single folder.',
      zh: '把相关代码段整理到一个分组中。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Create a group' },
        { type: 'p', text: 'From your profile, choose New group. Add a name, description, tags and visibility.' },
        { type: 'h', text: 'Add snippets' },
        { type: 'p', text: 'Each snippet can belong to at most one group. Choose the group under Details in the snippet editor.' },
        { type: 'h', text: 'Group pages' },
        { type: 'p', text: 'A group has its own URL: /{username}/{groupSlug}. Visitors see the public snippets inside; the owner sees all of them. Edit the group from your profile or from the group page. Deleting it keeps the snippets but removes their group.' },
        { type: 'note', text: 'If the group URL is already used, a numeric suffix is added and the dialog tells you the final URL.' }
      ],
      zh: [
        { type: 'h', text: '创建分组' },
        { type: 'p', text: '在个人主页点 New group，填写名称、介绍、标签和可见性。' },
        { type: 'h', text: '加入代码段' },
        { type: 'p', text: '每个代码段最多属于一个分组。在代码段编辑器的 Details 中选择分组。' },
        { type: 'h', text: '分组页面' },
        { type: 'p', text: '分组有自己的地址：/{username}/{groupSlug}。访客看到组内的公开代码段，作者看到全部。可以在个人主页或分组页面编辑；删除分组会保留代码段，只解除归属。' },
        { type: 'note', text: '如果分组 URL 已被占用，会自动追加数字，弹窗会提示最终 URL。' }
      ]
    }
  },
  {
    slug: 'search',
    title: { en: 'Search and the command box', zh: '搜索与指令框' },
    summary: {
      en: 'Find snippets, groups and catalog entries quickly.',
      zh: '快速查找代码段、分组和目录条目。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'Press / anywhere outside an input to open the command box. Commands are case-insensitive.' },
        {
          type: 'table',
          headers: ['Command', 'What it finds'],
          rows: [
            ['/language', 'Programming languages'],
            ['/framework, /lib, /tool, /runtime', 'Catalog dependencies by type'],
            ['/dep', 'Any dependency'],
            ['/snippet', 'Public snippets (keywords allowed)'],
            ['/group', 'Public groups (keywords allowed)'],
            ['/user', 'Public users'],
            ['/new', 'Create a snippet'],
            ['/me', 'Your profile'],
            ['/followers', 'Open your followers'],
            ['/following', 'Open people you follow'],
            ['/favorites', 'Open your favorites tab'],
            ['/feedback', 'Open feedback received'],
            ['/reports', 'Open reports you submitted'],
            ['/requests', 'Open your catalog requests'],
            ['/changelog', 'Open the public changelog'],
            ['/go', 'Site pages'],
            ['/search', 'Search all public content (keywords allowed)']
          ]
        },
        { type: 'p', text: 'The command box shows a quick first page of matches. Choose “View all results” or use /search with keywords to open the full search page with pagination.' },
        { type: 'h', text: 'Keywords' },
        { type: 'p', text: 'After /snippet or /group, separate keywords with spaces. All keywords must match; snippets are searched by title, description, tags, language and dependencies.' },
        { type: 'code', language: 'bash', text: '/snippet vue primevue theme' },
        { type: 'h', text: 'Catalog pages' },
        { type: 'p', text: 'Language and dependency pages list the public snippets using that entry, plus groups that contain them. Use the tabs and search to narrow the list.' },
        { type: 'note', text: 'Unlisted content is reachable by direct link; private content never appears in search.' }
      ],
      zh: [
        { type: 'p', text: '在非输入框位置按 / 可以打开指令框，指令不区分大小写。' },
        {
          type: 'table',
          headers: ['指令', '检索内容'],
          rows: [
            ['/language', '编程语言'],
            ['/framework、/lib、/tool、/runtime', '按类型检索依赖'],
            ['/dep', '全部依赖类型'],
            ['/snippet', '公开代码段（支持关键词）'],
            ['/group', '公开分组（支持关键词）'],
            ['/user', '公开用户'],
            ['/new', '新建代码段'],
            ['/me', '自己的主页'],
            ['/followers', '打开粉丝列表'],
            ['/following', '打开关注列表'],
            ['/favorites', '打开收藏 Tab'],
            ['/feedback', '打开收到的反馈'],
            ['/reports', '打开我提交的举报'],
            ['/requests', '打开目录申请'],
            ['/changelog', '打开公开更新日志'],
            ['/go', '站点页面'],
            ['/search', '搜索全部公开内容（支持关键词）']
          ]
        },
        { type: 'p', text: '指令框只显示第一页快速结果；选择“View all results”，或在 /search 后输入关键词，会打开带翻页的完整搜索页。' },
        { type: 'h', text: '关键词' },
        { type: 'p', text: '在 /snippet 或 /group 后面用空格分隔多个关键词，所有关键词都要命中；代码段会检索名称、介绍、标签、语言和依赖。' },
        { type: 'code', language: 'bash', text: '/snippet vue primevue theme' },
        { type: 'h', text: '目录页面' },
        { type: 'p', text: '语言 / 依赖详情页会列出引用该条目的公开代码段，以及包含这些代码段的分组；可以用 Tab 和搜索收窄结果。' },
        { type: 'note', text: '不可搜索内容可通过直接链接访问；私有内容不会出现在搜索中。' }
      ]
    }
  },
  {
    slug: 'profile',
    title: { en: 'Your profile', zh: '个人主页' },
    summary: {
      en: 'What visitors see, and what only you can see.',
      zh: '访客能看到什么，以及只有作者能看到的操作。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'Your profile lives at /{username}. It shows your avatar, nickname, bio, links, content counts and your public snippets and groups.' },
        { type: 'p', text: 'The contribution calendar summarizes the last year of activity. Creating a snippet, creating a group and submitting feedback each add one contribution. Only daily counts are public; content titles and feedback details are not shown. Switch between 2D, 3D and Both views; your choice is remembered on this device. The summary also shows total, this week, best day, average, longest streak and current streak.' },
        { type: 'h', text: 'Owner view' },
        { type: 'p', text: 'When you are signed in, your profile also shows private and unlisted items with badges, plus New snippet, New group, Account and Links actions. Search and Load more work on both lists.' },
        { type: 'h', text: 'Profile tabs' },
        { type: 'p', text: 'The profile has four tabs: Profile, Favorites, Reports & feedback and Requests. The URL stays at /{username}; switch with ?tab=favorites, ?tab=feedback, ?tab=reports or ?tab=requests. The left profile card stays in place while the right side changes.' },
        { type: 'p', text: 'Favorites lists saved snippets and groups. Reports & feedback contains feedback received on your snippets and reports you submitted. Requests lists your catalog requests. These tabs are private to you and return a 404 for other visitors.' },
        { type: 'h', text: 'Order and traffic' },
        { type: 'p', text: 'Owners can pin up to three snippets and three groups; pinned items stay at the top. Use Reorder to drag items into place; the dialog loads 50 items at a time and keeps unloaded items in their existing order. Snippet and group cards show copies, forks and favorites.' },
        { type: 'h', text: 'Followers' },
        { type: 'p', text: 'Visitors can follow you. Click the followers or following number to open the list; the dialog supports search and load more. As the profile owner you can remove a follower or unfollow someone from these lists.' },
        { type: 'note', text: 'Visitors only see public content and community counts.' }
      ],
      zh: [
        { type: 'p', text: '个人主页地址为 /{username}，展示头像、昵称、简介、开放链接、内容统计，以及公开的代码段和分组。' },
        { type: 'p', text: '贡献日历展示最近一年的活跃度。创建代码段、创建分组和提交反馈各计 1 次贡献；公开的只有每日数量，不展示内容标题或反馈内容。支持 2D、3D、Both 三种视图，并会记住当前设备上的选择；同时显示总数、本周、最佳单日、平均、最长连续和当前连续贡献。' },
        { type: 'h', text: '作者视图' },
        { type: 'p', text: '登录后，自己的主页还会显示私有 / 不可搜索内容及可见性标签，并提供 New snippet、New group、Account、Links 操作；两个列表都支持搜索和 Load more。' },
        { type: 'h', text: '个人主页 Tab' },
        { type: 'p', text: '个人主页有四类内容：Profile、Favorites、Reports & feedback 和 Requests。地址仍然是 /{username}，通过 ?tab=favorites、?tab=feedback、?tab=reports 或 ?tab=requests 切换。切换时左侧个人信息保持不变，只更新右侧内容。' },
        { type: 'p', text: 'Favorites 显示收藏的代码段和分组；Reports & feedback 显示收到的反馈与自己提交的举报；Requests 显示目录申请。这些 Tab 只有本人可以访问，其他用户会看到 404。' },
        { type: 'h', text: '排序与流量' },
        { type: 'p', text: '作者最多可以置顶 3 个代码段和 3 个分组，置顶内容始终排在前面。使用 Reorder 拖拽排序，弹窗每次加载 50 条，未加载的条目保持原顺序。代码段与分组卡片会显示 Copy、Fork 和收藏数据。' },
        { type: 'h', text: '关注与粉丝' },
        { type: 'p', text: '访客可以关注你。点击粉丝 / 关注数字打开列表弹窗，支持搜索和加载更多；作者本人可以在列表中移除粉丝或取消关注。' },
        { type: 'note', text: '访客只能看到公开内容和社区统计。' }
      ]
    }
  },
  {
    slug: 'copy-fork',
    title: { en: 'Copy and fork', zh: '拷贝与 Fork' },
    summary: {
      en: 'Reuse existing snippets without losing the source.',
      zh: '复用已有代码段，同时保留来源。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Share' },
        { type: 'p', text: 'Use Share on a snippet or group page to copy its direct link. Public and unlisted links open for anyone with the link; private links open only for the owner.' },
        { type: 'h', text: 'Copy' },
        { type: 'p', text: 'Use Copy on a snippet to put the code on your clipboard. Copies are counted at most once per hour per visitor and snippet.' },
        { type: 'h', text: 'Fork a snippet' },
        { type: 'p', text: 'On a public snippet, choose Fork. A dialog lets you edit the copy’s URL name and choose its visibility (private, unlisted or public) before creating it. The copy belongs to you and keeps a “Forked from” link to the original. The original fork count increases.' },
        { type: 'h', text: 'Fork a group' },
        { type: 'p', text: 'On a public group, choose Fork group. Confirm the copy’s URL name and visibility, then create it. Bits copies the group and its public snippets; private snippets in the original are not copied. The group copy is private by default.' },
        { type: 'note', text: 'You must be signed in with a username to fork.' }
      ],
      zh: [
        { type: 'h', text: '分享' },
        { type: 'p', text: '在代码段或分组页面点击 Share，即可复制该页面的直达链接。公开和 Unlisted 链接任何人都能打开；私有内容只有作者本人能打开。' },
        { type: 'h', text: '拷贝' },
        { type: 'p', text: '在代码段页面点击 Copy 把代码复制到剪贴板。同一访客对同一代码段每小时最多计一次拷贝。' },
        { type: 'h', text: 'Fork 代码段' },
        { type: 'p', text: '公开代码段上可以点 Fork。弹窗允许先修改副本的 URL 名和可见性（私有 / 不可搜索 / 公开）再创建。副本属于你，并保留指向原代码段的 “Forked from” 链接；原代码段的 Fork 数会增加。' },
        { type: 'h', text: 'Fork 分组' },
        { type: 'p', text: '公开分组上可以点 Fork group。确认副本的 URL 名和可见性后再创建。Bits 会复制分组和组内公开代码段；原分组里的私有代码段不会被复制，分组副本默认私有。' },
        { type: 'note', text: 'Fork 需要登录并已设置用户名。' }
      ]
    }
  },
  {
    slug: 'visibility',
    title: { en: 'Visibility and privacy', zh: '可见性与隐私' },
    summary: {
      en: 'Choose who can open a snippet or group.',
      zh: '选择谁可以打开代码段或分组。'
    },
    blocks: {
      en: [
        {
          type: 'table',
          headers: ['Visibility', 'Who can open it'],
          rows: [
            ['Public', 'Everyone; listed on profiles, catalog pages and search'],
            ['Unlisted', 'Anyone with the link; excluded from search and marked noindex'],
            ['Private', 'Only the owner']
          ]
        },
        { type: 'p', text: 'Public and unlisted content require a username. Private content is never exposed on public pages. Visitors without permission get a 404, the same as a missing page.' },
        { type: 'p', text: 'Deleting content hides it immediately; an administrator can restore it.' },
        { type: 'note', text: 'A snippet follows its own visibility. A group page follows the group’s visibility and lists only snippets the visitor may open.' }
      ],
      zh: [
        {
          type: 'table',
          headers: ['可见性', '谁可以打开'],
          rows: [
            ['公开', '所有人；出现在主页、目录页和搜索中'],
            ['不可搜索', '拿到链接的人；不出现在搜索中，并标记 noindex'],
            ['私有', '仅作者本人']
          ]
        },
        { type: 'p', text: '公开 / 不可搜索内容要求先设置用户名。私有内容不会出现在公开页面；没有权限的访客会看到 404，与页面不存在时一致。' },
        { type: 'p', text: '删除内容后立即隐藏，站点管理员可以恢复。' },
        { type: 'note', text: '代码段按自身可见性判断；分组页按分组可见性判断，并且只列出访客有权限打开的代码段。' }
      ]
    }
  },
  {
    slug: 'requests',
    title: { en: 'Language and dependency requests', zh: '语言与依赖申请' },
    summary: {
      en: 'Ask for catalog entries that do not exist yet.',
      zh: '申请目录里还没有的语言或依赖。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'If a language or dependency is missing, use Request a new language / dependency in the editor, or open /request. Sign in first.' },
        {
          type: 'ul',
          items: [
            'Languages: name and official website.',
            'Dependencies: name, official website, type and applicable languages.'
          ]
        },
        { type: 'p', text: 'An administrator reviews the request and completes the catalog fields. Approved entries appear in the catalog and selectors. Check the status in your profile → Requests (/{username}?tab=requests).' },
        { type: 'note', text: 'Requests are rate-limited, and duplicate names are rejected.' }
      ],
      zh: [
        { type: 'p', text: '如果语言或依赖缺失，可以在编辑器中使用申请链接，或直接访问 /request。提交前需要登录。' },
        {
          type: 'ul',
          items: [
            '语言：名称与官方网站。',
            '依赖：名称、官方网站、类型和适用语言。'
          ]
        },
        { type: 'p', text: '管理员审核后会补全目录字段；通过后条目会出现在目录与选择器中。可以在个人主页 → Requests（/{username}?tab=requests）查看状态。' },
        { type: 'note', text: '申请有频率限制，重名条目会被拒绝。' }
      ]
    }
  },
  {
    slug: 'changelog',
    title: { en: 'Changelog', zh: '更新日志' },
    summary: {
      en: 'See what changed on Bits, newest first.',
      zh: '按时间查看 Bits 的更新内容。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'The public changelog lives at /changelog and is linked from the footer. It is a timeline of published product updates, newest first.' },
        { type: 'p', text: 'Entries are written and published from the admin console. Drafts stay hidden until they are published; older updates load in batches of 20.' },
        { type: 'note', text: 'The changelog is for product updates. Bugs and content issues should be reported through the snippet feedback or report tools.' }
      ],
      zh: [
        { type: 'p', text: '公开更新日志位于 /changelog，页脚也有入口；页面以时间线展示已发布的产品更新，最新内容在前。' },
        { type: 'p', text: '更新日志由控制台编辑和发布。草稿不会出现在公开页面；更早的更新每次加载 20 条。' },
        { type: 'note', text: '更新日志用于产品更新；代码问题或内容问题请使用代码段反馈或举报功能。' }
      ]
    }
  },
  {
    slug: 'faq',
    title: { en: 'FAQ', zh: '常见问题' },
    summary: {
      en: 'Common questions about publishing and links.',
      zh: '关于发布与链接的常见问题。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Why can I not publish?' },
        { type: 'p', text: 'Public and unlisted content needs a username. Set one under Account → Profile.' },
        { type: 'h', text: 'Why did my URL get a -2?' },
        { type: 'p', text: 'Some automatically generated group URLs receive a numeric suffix when that URL is already used. Snippet editors instead derive the URL from Name and ask you to choose another Name when it is taken.' },
        { type: 'h', text: 'Why does my link return 404?' },
        { type: 'p', text: 'The content may be private, deleted, or owned by another account. Private and deleted content is hidden from visitors.' },
        { type: 'h', text: 'Can I change the URL?' },
        { type: 'p', text: 'Yes. Edit the snippet and change its Name; the read-only URL name updates with it. Bits checks the generated URL before saving. The old URL redirects to the new one, including /raw and /edit. URL names must be unique within your account.' },
        { type: 'h', text: 'How do I delete content?' },
        { type: 'p', text: 'Use Delete from your profile, the snippet page, or the edit screen. Groups can be deleted from the profile or the group page.' },
        { type: 'h', text: 'Who can restore deleted content?' },
        { type: 'p', text: 'Site administrators can restore it from the console. Contact them with the URL.' }
      ],
      zh: [
        { type: 'h', text: '为什么不能发布？' },
        { type: 'p', text: '公开 / 不可搜索内容要求先设置用户名。请到 Account → Profile 设置。' },
        { type: 'h', text: '为什么 URL 后面多了 -2？' },
        { type: 'p', text: '部分自动生成的分组 URL 在已被占用时会追加数字后缀。代码段编辑器则根据 Name 生成 URL；如果已被占用，需要修改 Name。' },
        { type: 'h', text: '为什么链接返回 404？' },
        { type: 'p', text: '内容可能是私有的、已删除的，或属于其他账户。私有与已删除内容不会对访客开放。' },
        { type: 'h', text: '可以修改 URL 吗？' },
        { type: 'p', text: '可以。编辑代码段时修改 Name，只读的 URL 名会同步更新；保存前 Bits 会检测生成的 URL。旧地址（包括 /raw 和 /edit）会自动重定向到新地址。同一账户内的 URL 名必须唯一。' },
        { type: 'h', text: '如何删除内容？' },
        { type: 'p', text: '在个人主页、代码段页面或编辑页使用 Delete；分组可在个人主页或分组页面删除。' },
        { type: 'h', text: '谁能恢复已删除内容？' },
        { type: 'p', text: '站点管理员可以在后台恢复。请联系管理员并提供 URL。' }
      ]
    }
  },
  {
    slug: 'developer',
    title: { en: 'Developer platform', zh: '开发者平台' },
    summary: {
      en: 'Build integrations with Apps, OAuth and API Keys.',
      zh: '使用 App、OAuth 与 API Key 构建集成。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'The Developer portal lets you register applications and grant them access to BITS. Open /developer after signing in.' },
        { type: 'h', text: 'Requirements' },
        {
          type: 'ul',
          items: [
            'Your account must have a username, a password and two-factor authentication enabled.',
            'OAuth integrations start with an App.',
            'API Keys are account-level credentials and do not belong to an App.',
            'Apps use OAuth profile scopes; API Keys are limited to the content permissions you select.'
          ]
        },
        { type: 'h', text: 'Sections' },
        {
          type: 'table',
          headers: ['Section', 'Purpose'],
          rows: [
            ['Apps', 'OAuth application identity, homepage, icon and description'],
            ['OAuth', 'Authorization-code, PKCE, refresh and device flows'],
            ['API Keys', 'Scoped server-to-server keys for the Open API'],
            ['Docs', 'Reference chapters for each integration method']
          ]
        },
        { type: 'p', text: 'The machine-readable API description is available at /api/v1/openapi.json and /openapi.json (OpenAPI 3.1, API version 1.0.0).' },
        { type: 'note', text: 'OAuth and API Keys act on your account. Keep client secrets and API keys private, and revoke anything you no longer use.' }
      ],
      zh: [
        { type: 'p', text: '登录后访问 /developer 进入开发者中心。你可以在这里注册应用，并授予它们访问 Bits 的能力。' },
        { type: 'h', text: '使用条件' },
        {
          type: 'ul',
          items: [
            '账户必须已设置用户名、密码并开启双重验证。',
            'OAuth 集成需要先创建一个 App。',
            'API Key 属于账户，不隶属于任何 App。',
            'App 通过 OAuth 获取资料范围；API Key 只能使用你勾选的内容权限。'
          ]
        },
        { type: 'h', text: '主要入口' },
        {
          type: 'table',
          headers: ['入口', '用途'],
          rows: [
            ['Apps', 'OAuth 应用名称、主页、图标和介绍'],
            ['OAuth', '授权码、PKCE、刷新与设备流'],
            ['API Keys', '用于开放 API 的细分权限服务端密钥'],
            ['Docs', '各类接入方式的完整参考']
          ]
        },
        { type: 'p', text: '机器可读的接口描述位于 /api/v1/openapi.json 与 /openapi.json（OpenAPI 3.1，API 版本 1.0.0）。' },
        { type: 'note', text: 'OAuth 与 API Key 都以你的账户身份操作。请妥善保管 Client Secret 与 API Key，不再使用时及时撤销。' }
      ]
    }
  },
  {
    slug: 'developer/apps',
    title: { en: 'Apps', zh: '应用（Apps）' },
    summary: {
      en: 'Create an App for an OAuth integration.',
      zh: '为 OAuth 集成创建应用。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Create an App' },
        { type: 'p', text: 'Open Developer → Apps and choose New app. Enter the application name, homepage URL, optional icon URL and description.' },
        { type: 'h', text: 'Application fields' },
        {
          type: 'ul',
          items: [
            'Name: up to 80 characters; shown on authorization screens.',
            'Homepage URL: a valid http(s) URL.',
            'Icon URL: optional; shown beside the App.',
            'Description: up to 500 characters.'
          ]
        },
        { type: 'h', text: 'OAuth services' },
        { type: 'p', text: 'Every App can register one OAuth service. Server-to-server access uses a separate, account-level API Key and does not require an App.' },
        { type: 'h', text: 'Deleting an App' },
        { type: 'p', text: 'Deleting an App also deletes its OAuth service and OAuth tokens. API Keys belong to your account and are not deleted. This cannot be undone. The confirmation dialog asks you to type the exact delete phrase.' },
        { type: 'note', text: 'Use API Keys for API-only integrations. Apps are only needed when you want an OAuth client ID and secret.' }
      ],
      zh: [
        { type: 'h', text: '创建应用' },
        { type: 'p', text: '打开 Developer → Apps，点击 New app，填写应用名称、主页 URL、可选图标 URL 和介绍。' },
        { type: 'h', text: '字段说明' },
        {
          type: 'ul',
          items: [
            '名称：最多 80 个字符，会显示在授权页面。',
            '主页 URL：合法的 http(s) 地址。',
            '图标 URL：可选，显示在应用名称旁。',
            '介绍：最多 500 个字符。'
          ]
        },
        { type: 'h', text: 'OAuth 服务' },
        { type: 'p', text: '每个 App 可以注册一个 OAuth 服务。纯服务端访问请使用独立的账户级 API Key，不需要创建 App。' },
        { type: 'h', text: '删除应用' },
        { type: 'p', text: '删除 App 会同时删除它的 OAuth 服务与 OAuth 令牌；API Key 属于账户，不会被删除。此操作无法恢复，确认弹窗会要求原样输入删除短语。' },
        { type: 'note', text: '纯 API 集成请使用 API Key。只有在需要 OAuth Client ID 与 Client Secret 时才需要创建 App。' }
      ]
    }
  },
  {
    slug: 'developer/oauth',
    title: { en: 'OAuth', zh: 'OAuth 授权' },
    summary: {
      en: 'Connect an App with OAuth 2.0 and PKCE.',
      zh: '通过 OAuth 2.0 与 PKCE 接入应用。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'Register a service under Developer → OAuth, choose an App, add its redirect URIs and configure wildcard matching, device flow and token expiry.' },
        { type: 'h', text: 'Credentials' },
        {
          type: 'ul',
          items: [
            'Client ID: the App ID.',
            'Client secret: shown once when the service is created or reset.',
            'Redirect URIs: up to 10; HTTPS is required outside localhost.',
            'Each App can have one OAuth service.'
          ]
        },
        { type: 'h', text: 'Endpoints' },
        { type: 'code', language: 'http', text: `GET  /oauth/authorize
POST /oauth/token
GET  /oauth/userinfo
POST /oauth/revoke
POST /oauth/device/code
GET  /oauth/device` },
        { type: 'h', text: 'Authorization code flow' },
        { type: 'p', text: 'The signed-in user must have a username and password before authorizing an application. Send the user to the authorization endpoint:' },
        { type: 'code', language: 'http', text: `GET /oauth/authorize?client_id=CLIENT_ID
  &redirect_uri=https://example.com/auth
  &response_type=code
  &scope=read:user%20read:email
  &state=RANDOM_STATE
  &code_challenge=CHALLENGE
  &code_challenge_method=S256` },
        { type: 'p', text: 'After approval, exchange the code at the token endpoint:' },
        { type: 'code', language: 'bash', text: `curl -X POST https://bits.micropue.com.cn/oauth/token \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d grant_type=authorization_code \\
  -d code=CODE \\
  -d redirect_uri=https://example.com/auth \\
  -d client_id=CLIENT_ID \\
  -d client_secret=CLIENT_SECRET \\
  -d code_verifier=VERIFIER` },
        { type: 'h', text: 'PKCE' },
        { type: 'p', text: 'Use code_challenge_method=S256 (plain is also accepted). Generate a random verifier, send its SHA-256 challenge during authorization and the original verifier during the token exchange.' },
        { type: 'h', text: 'Scopes' },
        {
          type: 'table',
          headers: ['Scope', 'Access'],
          rows: [
            ['read:user', 'Basic profile: subject, username, nickname and avatar'],
            ['read:email', 'Email address']
          ]
        },
        { type: 'h', text: 'UserInfo' },
        { type: 'code', language: 'bash', text: 'curl https://bits.micropue.com.cn/oauth/userinfo \\\n  -H "Authorization: Bearer ACCESS_TOKEN"' },
        { type: 'h', text: 'Refresh and rotation' },
        { type: 'p', text: 'When token expiration is enabled, access tokens last one hour and a refresh token is issued for 30 days. Refresh tokens rotate. Reusing an old refresh token revokes the entire token family.' },
        { type: 'h', text: 'Device flow' },
        { type: 'p', text: 'Enable device flow for the service, request a device code at /oauth/device/code, show user_code to the user and poll /oauth/token with grant_type=urn:ietf:params:oauth:grant-type:device_code until authorization completes.' },
        { type: 'note', text: 'OAuth grants profile access only. To manage snippets and groups programmatically, create an API Key instead.' }
      ],
      zh: [
        { type: 'p', text: '在 Developer → OAuth 注册服务，选择 App，填写重定向 URI，并配置通配符、设备流和令牌有效期。' },
        { type: 'h', text: '凭据' },
        {
          type: 'ul',
          items: [
            'Client ID：即 App ID。',
            'Client Secret：创建或重置服务时只显示一次。',
            '重定向 URI：最多 10 条；除 localhost 外必须使用 HTTPS。',
            '每个 App 只能有一个 OAuth 服务。'
          ]
        },
        { type: 'h', text: '端点' },
        { type: 'code', language: 'http', text: `GET  /oauth/authorize
POST /oauth/token
GET  /oauth/userinfo
POST /oauth/revoke
POST /oauth/device/code
GET  /oauth/device` },
        { type: 'h', text: '授权码流程' },
        { type: 'p', text: '授权前，登录用户必须已设置用户名和密码。将用户引导到授权端点：' },
        { type: 'code', language: 'http', text: `GET /oauth/authorize?client_id=CLIENT_ID
  &redirect_uri=https://example.com/auth
  &response_type=code
  &scope=read:user%20read:email
  &state=RANDOM_STATE
  &code_challenge=CHALLENGE
  &code_challenge_method=S256` },
        { type: 'p', text: '用户同意后，用授权码换取令牌：' },
        { type: 'code', language: 'bash', text: `curl -X POST https://bits.micropue.com.cn/oauth/token \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d grant_type=authorization_code \\
  -d code=CODE \\
  -d redirect_uri=https://example.com/auth \\
  -d client_id=CLIENT_ID \\
  -d client_secret=CLIENT_SECRET \\
  -d code_verifier=VERIFIER` },
        { type: 'h', text: 'PKCE' },
        { type: 'p', text: '使用 code_challenge_method=S256（也接受 plain）。生成随机 verifier，授权时发送其 SHA-256 challenge，换取令牌时发送原始 verifier。' },
        { type: 'h', text: '权限范围' },
        {
          type: 'table',
          headers: ['Scope', '可读取内容'],
          rows: [
            ['read:user', '基础资料：用户标识、用户名、昵称和头像'],
            ['read:email', '邮箱地址']
          ]
        },
        { type: 'h', text: 'UserInfo' },
        { type: 'code', language: 'bash', text: 'curl https://bits.micropue.com.cn/oauth/userinfo \\\n  -H "Authorization: Bearer ACCESS_TOKEN"' },
        { type: 'h', text: '刷新与轮换' },
        { type: 'p', text: '启用令牌过期后，Access Token 有效期为 1 小时，并签发 30 天有效的 Refresh Token。Refresh Token 每次刷新都会轮换；重复使用旧令牌会撤销整个令牌族。' },
        { type: 'h', text: '设备流' },
        { type: 'p', text: '为服务启用设备流后，在 /oauth/device/code 申请设备码，向用户展示 user_code，并用 grant_type=urn:ietf:params:oauth:grant-type:device_code 轮询 /oauth/token，直到用户完成授权。' },
        { type: 'note', text: 'OAuth 只读取个人资料。如需以程序方式管理代码段和分组，请创建 API Key。' }
      ]
    }
  },
  {
    slug: 'developer/api-keys',
    title: { en: 'API Keys', zh: 'API Key' },
    summary: {
      en: 'Create scoped keys for the BITS Open API.',
      zh: '为 Bits 开放 API 创建带权限范围的密钥。'
    },
    blocks: {
      en: [
        { type: 'h', text: 'Create a key' },
        { type: 'p', text: 'Open Developer → API Keys and choose New API key. Name the key, choose permissions and an expiry of 30, 90, 365 days or never. No App selection is required.' },
        { type: 'h', text: 'Permissions' },
        {
          type: 'table',
          headers: ['Permission', 'Allows'],
          rows: [
            ['content:read', 'List and read your own snippets and groups'],
            ['content:create', 'Create snippets and groups'],
            ['content:update', 'Edit snippets and groups, including URL names'],
            ['content:delete', 'Soft-delete snippets and delete groups']
          ]
        },
        { type: 'h', text: 'Key lifecycle' },
        {
          type: 'ul',
          items: [
            'The full key is shown once, immediately after creation. Only a hash is stored.',
            'The list shows a prefix, permissions, expiry, creation time and last-used time.',
            'Revoke a key at any time; requests using it fail immediately.',
            'A user can have up to 50 active keys.',
            'Keys belong to your account, not to an App.'
          ]
        },
        { type: 'p', text: 'API Keys cannot change account details, security settings, email, passwords, OAuth grants or social links. They only operate on your content through the Open API.' },
        { type: 'note', text: 'Store keys in a secret manager, never in browser code or public repositories. Use the smallest permission set that works.' }
      ],
      zh: [
        { type: 'h', text: '创建密钥' },
        { type: 'p', text: '打开 Developer → API Keys，点击 New API key。填写名称、勾选权限，并选择 30、90、365 天或永不过期；不需要选择 App。' },
        { type: 'h', text: '权限' },
        {
          type: 'table',
          headers: ['权限', '允许的操作'],
          rows: [
            ['content:read', '列出并读取自己的代码段和分组'],
            ['content:create', '新建代码段和分组'],
            ['content:update', '修改代码段和分组，包括 URL 名'],
            ['content:delete', '软删除代码段、删除分组']
          ]
        },
        { type: 'h', text: '密钥生命周期' },
        {
          type: 'ul',
          items: [
            '完整 Key 只在创建成功后显示一次，服务端只保存哈希。',
            '列表显示前缀、权限、过期时间、创建时间和上次使用时间。',
            '可以随时撤销；撤销后使用该 Key 的请求会立即失败。',
            '每个用户最多保留 50 个有效 Key。',
            'Key 属于你的账户，不隶属于任何 App。'
          ]
        },
        { type: 'p', text: 'API Key 不能修改账户资料、安全设置、邮箱、密码、OAuth 授权或社交链接，只能通过开放 API 操作你的内容。' },
        { type: 'note', text: '请把 Key 存放在密钥管理服务中，不要写入前端代码或公开仓库；只授予实际需要的最小权限。' }
      ]
    }
  },
  {
    slug: 'developer/open-api',
    title: { en: 'Open API v1', zh: '开放 API v1' },
    summary: {
      en: 'Manage your snippets and groups with an API Key.',
      zh: '使用 API Key 管理自己的代码段与分组。'
    },
    blocks: {
      en: [
        { type: 'p', text: 'The Open API is versioned under /api/v1. It accepts API Keys only; site cookies and OAuth access tokens are rejected. API metadata is at /api/v1 and the machine-readable OpenAPI 3.1 document is available at /api/v1/openapi.json and /openapi.json. API Keys belong to your account and are not tied to an App.' },
        { type: 'h', text: 'Authentication' },
        { type: 'code', language: 'bash', text: 'curl https://bits.micropue.com.cn/api/v1/me \\\n  -H "Authorization: Bearer bits_sk_YOUR_KEY"' },
        { type: 'p', text: 'You can also send the key in the X-API-Key header. Never put it in a query string.' },
        { type: 'h', text: 'Rate limits' },
        {
          type: 'table',
          headers: ['Operation', 'Limit'],
          rows: [
            ['Read requests', '120 per minute per key'],
            ['Write requests', '30 per minute per key'],
            ['Account reads, across all keys', '240 per minute'],
            ['Account writes, across all keys', '60 per minute'],
            ['Invalid authentication attempts', '30 per minute per IP address']
          ]
        },
        { type: 'p', text: 'Both the per-key and account-wide limits apply. Exceeding either returns 429. API rate limiting fails closed: if the rate-limit store is unavailable, requests are rejected rather than allowed through.' },
        { type: 'h', text: 'Endpoints' },
        {
          type: 'table',
          headers: ['Method and path', 'Permission', 'Purpose'],
          rows: [
            ['GET /api/v1', 'None', 'API name, version, documentation and OpenAPI URL'],
            ['GET /api/v1/openapi.json', 'None', 'OpenAPI 3.1 specification'],
            ['GET /api/v1/me', 'content:read', 'Current user and key summary'],
            ['GET /api/v1/snippets', 'content:read', 'List your snippets'],
            ['POST /api/v1/snippets', 'content:create', 'Create a snippet'],
            ['GET /api/v1/snippets/{slug}', 'content:read', 'Read one snippet'],
            ['PATCH /api/v1/snippets/{slug}', 'content:update', 'Update fields or the URL name'],
            ['DELETE /api/v1/snippets/{slug}', 'content:delete', 'Soft-delete a snippet'],
            ['GET /api/v1/groups', 'content:read', 'List your groups'],
            ['POST /api/v1/groups', 'content:create', 'Create a group'],
            ['GET /api/v1/groups/{slug}', 'content:read', 'Read one group'],
            ['PATCH /api/v1/groups/{slug}', 'content:update', 'Update fields or the URL name'],
            ['DELETE /api/v1/groups/{slug}', 'content:delete', 'Delete a group']
          ]
        },
        { type: 'h', text: 'List, search and paginate' },
        { type: 'p', text: 'List endpoints accept limit (1–50, default 20), offset (0–10,000), q for a title/description search, and visibility=public|unlisted|private. Responses include a pagination object with total and hasMore. Snippet list items omit code; read one snippet to get its code body.' },
        { type: 'p', text: 'Snippet dependencies are limited to 50 unique values and must belong to the selected language.' },
        { type: 'code', language: 'bash', text: 'curl "https://bits.micropue.com.cn/api/v1/snippets?limit=20&offset=0&visibility=public&q=vue" \\\n  -H "X-API-Key: bits_sk_YOUR_KEY"' },
        { type: 'h', text: 'Create a snippet' },
        { type: 'code', language: 'json', text: `{
  "name": "PrimeVue theme token",
  "intro": "Read the active primary color",
  "slug": "primevue-theme-token",
  "language": "typescript",
  "visibility": "private",
  "tags": ["vue", "primevue"],
  "dependencies": ["primevue"],
  "code": "const color = getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color')"
}` },
        { type: 'h', text: 'Update and rename' },
        { type: 'p', text: 'PATCH is partial: omitted fields keep their current values. Send slug to rename. A successful rename returns meta.previousSlug and meta.slugChanged; the old public URL redirects to the new one.' },
        { type: 'h', text: 'Errors' },
        { type: 'p', text: 'Write requests must use Content-Type: application/json. Errors use RFC 9457 application/problem+json. Every response includes X-Request-Id and X-API-Version: v1. Rate limits are returned in X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset and the equivalent RateLimit-* headers; a 429 also includes Retry-After.' },
        { type: 'code', language: 'json', text: `{
  "type": "https://bits.micropue.com.cn/docs/developer/open-api#errors/conflict",
  "title": "Conflict",
  "status": 409,
  "code": "conflict",
  "detail": "This URL is already taken",
  "requestId": "req_662cac18ac6248209a45ac27743fe4e8",
  "errors": [
    { "path": "slug", "message": "This URL is already taken" }
  ]
}` },
        {
          type: 'table',
          headers: ['Status', 'Meaning'],
          rows: [
            ['400', 'Invalid field or malformed body'],
            ['401', 'Missing, invalid or expired API key'],
            ['403', 'Missing permission or disabled account'],
            ['404', 'Content not found in your account'],
            ['409', 'URL name already taken'],
            ['413', 'Request body exceeds 2 MB'],
            ['415', 'Write request is not application/json'],
            ['429', 'Rate limit exceeded'],
            ['500', 'Unexpected server error'],
            ['503', 'Rate-limit store unavailable']
          ]
        },
        { type: 'note', text: 'The Open API only manages your own snippets and groups. It cannot change account profile, email, password, 2FA, Passkeys, followers, favorites or OAuth grants.' }
      ],
      zh: [
        { type: 'p', text: '开放 API 的版本前缀为 /api/v1，只接受 API Key；站点 Cookie 与 OAuth Access Token 都会被拒绝。API Key 属于账户，不隶属于任何 App。API 元信息位于 /api/v1，OpenAPI 3.1 规范可从 /api/v1/openapi.json 与 /openapi.json 获取。' },
        { type: 'h', text: '认证' },
        { type: 'code', language: 'bash', text: 'curl https://bits.micropue.com.cn/api/v1/me \\\n  -H "Authorization: Bearer bits_sk_YOUR_KEY"' },
        { type: 'p', text: '也可以通过 X-API-Key 请求头传递。不要把 Key 放在 URL 查询参数中。' },
        { type: 'h', text: '节流限制' },
        {
          type: 'table',
          headers: ['操作', '限制'],
          rows: [
            ['读请求', '每个 Key 每分钟 120 次'],
            ['写请求', '每个 Key 每分钟 30 次'],
            ['账号读请求（所有 Key 合计）', '每分钟 240 次'],
            ['账号写请求（所有 Key 合计）', '每分钟 60 次'],
            ['无效认证尝试', '每个 IP 每分钟 30 次']
          ]
        },
        { type: 'p', text: '单 Key 与账号级限制同时生效，任一超限都会返回 429。开放 API 的限流采用故障关闭策略：限流存储不可用时请求会被拒绝，而不是直接放行。' },
        { type: 'h', text: '端点' },
        {
          type: 'table',
          headers: ['方法与路径', '所需权限', '用途'],
          rows: [
            ['GET /api/v1', '无需权限', 'API 名称、版本、文档与 OpenAPI 地址'],
            ['GET /api/v1/openapi.json', '无需权限', 'OpenAPI 3.1 规范'],
            ['GET /api/v1/me', 'content:read', '当前用户与 Key 摘要'],
            ['GET /api/v1/snippets', 'content:read', '列出自己的代码段'],
            ['POST /api/v1/snippets', 'content:create', '新建代码段'],
            ['GET /api/v1/snippets/{slug}', 'content:read', '读取单个代码段'],
            ['PATCH /api/v1/snippets/{slug}', 'content:update', '修改字段或 URL 名'],
            ['DELETE /api/v1/snippets/{slug}', 'content:delete', '软删除代码段'],
            ['GET /api/v1/groups', 'content:read', '列出自己的分组'],
            ['POST /api/v1/groups', 'content:create', '新建分组'],
            ['GET /api/v1/groups/{slug}', 'content:read', '读取单个分组'],
            ['PATCH /api/v1/groups/{slug}', 'content:update', '修改字段或 URL 名'],
            ['DELETE /api/v1/groups/{slug}', 'content:delete', '删除分组']
          ]
        },
        { type: 'h', text: '列表、搜索与分页' },
        { type: 'p', text: '列表端点支持 limit（1–50，默认 20）、offset（0–10,000）、q（按名称 / 介绍搜索）以及 visibility=public|unlisted|private。响应中的 pagination 包含 total 和 hasMore。代码段列表不返回代码正文，读取单个代码段时才会返回。' },
        { type: 'p', text: '代码段依赖最多 50 个唯一值，且必须属于所选语言。' },
        { type: 'code', language: 'bash', text: 'curl "https://bits.micropue.com.cn/api/v1/snippets?limit=20&offset=0&visibility=public&q=vue" \\\n  -H "X-API-Key: bits_sk_YOUR_KEY"' },
        { type: 'h', text: '新建代码段' },
        { type: 'code', language: 'json', text: `{
  "name": "PrimeVue theme token",
  "intro": "Read the active primary color",
  "slug": "primevue-theme-token",
  "language": "typescript",
  "visibility": "private",
  "tags": ["vue", "primevue"],
  "dependencies": ["primevue"],
  "code": "const color = getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color')"
}` },
        { type: 'h', text: '更新与改名' },
        { type: 'p', text: 'PATCH 是局部更新：未传字段保持原值。传入 slug 即可改名；成功后返回 meta.previousSlug 与 meta.slugChanged，旧公开地址会自动重定向到新地址。' },
        { type: 'h', text: '错误状态' },
        { type: 'p', text: '写请求必须使用 Content-Type: application/json。错误响应遵循 RFC 9457，使用 application/problem+json。所有响应都包含 X-Request-Id 与 X-API-Version: v1。限流信息通过 X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset 以及等效的 RateLimit-* 响应头返回；429 还会包含 Retry-After。' },
        { type: 'code', language: 'json', text: `{
  "type": "https://bits.micropue.com.cn/docs/developer/open-api#errors/conflict",
  "title": "Conflict",
  "status": 409,
  "code": "conflict",
  "detail": "This URL is already taken",
  "requestId": "req_662cac18ac6248209a45ac27743fe4e8",
  "errors": [
    { "path": "slug", "message": "This URL is already taken" }
  ]
}` },
        {
          type: 'table',
          headers: ['状态码', '含义'],
          rows: [
            ['400', '字段无效或请求体格式错误'],
            ['401', 'API Key 缺失、无效或已过期'],
            ['403', '缺少权限或账户被禁用'],
            ['404', '自己的账户下找不到该内容'],
            ['409', 'URL 名已被占用'],
            ['413', '请求体超过 2 MB'],
            ['415', '写请求不是 application/json'],
            ['429', '超过节流限制'],
            ['500', '服务器内部错误'],
            ['503', '限流存储不可用']
          ]
        },
        { type: 'note', text: '开放 API 只能管理自己的代码段与分组，不能修改账户资料、邮箱、密码、双重验证、Passkey、关注、收藏或 OAuth 授权。' }
      ]
    }
  }
]
