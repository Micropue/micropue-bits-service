// 公开文档内容（中英双语）
// 左侧章节目录 / 右侧正文；语言在客户端切换并记忆（bits-docs-locale）
// 新增章节时同时补 en / zh 两套 blocks，键集合保持一致

export type DocLocale = 'en' | 'zh'

export type DocBlock =
  | { type: 'p', text: string }
  | { type: 'h', text: string }
  | { type: 'ul', items: string[] }
  | { type: 'ol', items: string[] }
  | { type: 'code', text: string }
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
        { type: 'code', text: '/new' },
        { type: 'h', text: 'Three steps' },
        {
          type: 'ol',
          items: [
            'Language — pick the primary language. The dependency list is filtered by this choice.',
            'Dependencies — optional; only entries linked to the chosen language are listed.',
            'Details — add the title, description, tags, visibility, group and code.'
          ]
        },
        { type: 'p', text: 'The code editor highlights syntax based on the selected language. The title is used to generate the URL. If that URL name is already used in your account, a number is appended (-2, -3) and the success screen shows the final URL.' },
        {
          type: 'ul',
          items: [
            'Up to five free-form tags.',
            'At most one group per snippet.',
            'Visibility: public, unlisted or private.'
          ]
        },
        { type: 'note', text: 'Missing a language or dependency? Use the request links under the selectors.' }
      ],
      zh: [
        { type: 'h', text: '打开编辑器' },
        { type: 'p', text: '直接访问 /new，或按 / 打开指令框后选择 /new。' },
        { type: 'code', text: '/new' },
        { type: 'h', text: '三个步骤' },
        {
          type: 'ol',
          items: [
            '语言 — 选择主要语言，下一步的依赖列表会按此过滤。',
            '依赖 — 可选，只列出与该语言关联的目录条目。',
            '详情 — 填写名称、介绍、标签、可见性、分组，并粘贴代码。'
          ]
        },
        { type: 'p', text: '代码编辑器会根据所选语言高亮。名称会自动生成 URL；如果该 URL 名在你的账户下已被占用，会自动追加数字（-2、-3），创建成功页会显示最终 URL。' },
        {
          type: 'ul',
          items: [
            '最多 5 个自由标签。',
            '每个代码段最多属于一个分组。',
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
        { type: 'p', text: 'The URL name (slug) is fixed after creation. You can change the title, description, language, dependencies, tags, group, visibility and code.' },
        { type: 'h', text: 'Delete a snippet' },
        { type: 'p', text: 'Use Delete on the snippet page or the edit screen, then confirm. Deleted snippets stop resolving immediately. Deletion is soft: a site administrator can restore the snippet later.' },
        { type: 'note', text: 'Deleting a group never deletes its snippets; it only removes the grouping.' }
      ],
      zh: [
        { type: 'h', text: '编辑代码段' },
        { type: 'p', text: '在个人主页的代码段卡片上点 Edit，或在代码段页面点 Edit snippet。编辑器与创建表单一致，地址为 /{username}/{slug}/edit。' },
        { type: 'p', text: '创建后 URL 名（slug）不可修改。名称、介绍、语言、依赖、标签、分组、可见性和代码都可以修改。' },
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
            ['/go', 'Site pages']
          ]
        },
        { type: 'h', text: 'Keywords' },
        { type: 'p', text: 'After /snippet or /group, separate keywords with spaces. All keywords must match; snippets are searched by title, description, tags, language and dependencies.' },
        { type: 'code', text: '/snippet vue primevue theme' },
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
            ['/go', '站点页面']
          ]
        },
        { type: 'h', text: '关键词' },
        { type: 'p', text: '在 /snippet 或 /group 后面用空格分隔多个关键词，所有关键词都要命中；代码段会检索名称、介绍、标签、语言和依赖。' },
        { type: 'code', text: '/snippet vue primevue theme' },
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
        { type: 'h', text: 'Owner view' },
        { type: 'p', text: 'When you are signed in, your profile also shows private and unlisted items with badges, plus New snippet, New group, Edit profile and Links actions. Search and Load more work on both lists.' },
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
        { type: 'h', text: '作者视图' },
        { type: 'p', text: '登录后，自己的主页还会显示私有 / 不可搜索内容及可见性标签，并提供 New snippet、New group、Edit profile、Links 操作；两个列表都支持搜索和 Load more。' },
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
        { type: 'h', text: 'Copy' },
        { type: 'p', text: 'Use Copy on a snippet to put the code on your clipboard. Copies are counted at most once per hour per visitor and snippet.' },
        { type: 'h', text: 'Fork a snippet' },
        { type: 'p', text: 'On a public snippet, choose Fork. The copy belongs to you, starts as private, and keeps a “Forked from” link to the original. The original fork count increases.' },
        { type: 'h', text: 'Fork a group' },
        { type: 'p', text: 'On a public group, choose Fork group. Bits creates a private copy of the group and its public snippets. Private snippets in the original are not copied.' },
        { type: 'note', text: 'You must be signed in with a username to fork.' }
      ],
      zh: [
        { type: 'h', text: '拷贝' },
        { type: 'p', text: '在代码段页面点击 Copy 把代码复制到剪贴板。同一访客对同一代码段每小时最多计一次拷贝。' },
        { type: 'h', text: 'Fork 代码段' },
        { type: 'p', text: '公开代码段上可以点 Fork。副本属于你，默认私有，并保留指向原代码段的 “Forked from” 链接；原代码段的 Fork 数会增加。' },
        { type: 'h', text: 'Fork 分组' },
        { type: 'p', text: '公开分组上可以点 Fork group。Bits 会创建一个私有分组副本，并复制组内公开代码段；原分组里的私有代码段不会被复制。' },
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
        { type: 'p', text: 'The URL name was already used in your account. The display title is unchanged; the suffix keeps URLs unique.' },
        { type: 'h', text: 'Why does my link return 404?' },
        { type: 'p', text: 'The content may be private, deleted, or owned by another account. Private and deleted content is hidden from visitors.' },
        { type: 'h', text: 'Can I change the URL?' },
        { type: 'p', text: 'No. The slug is fixed after creation so links stay stable.' },
        { type: 'h', text: 'How do I delete content?' },
        { type: 'p', text: 'Use Delete from your profile, the snippet page, or the edit screen. Groups can be deleted from the profile or the group page.' },
        { type: 'h', text: 'Who can restore deleted content?' },
        { type: 'p', text: 'Site administrators can restore it from the console. Contact them with the URL.' }
      ],
      zh: [
        { type: 'h', text: '为什么不能发布？' },
        { type: 'p', text: '公开 / 不可搜索内容要求先设置用户名。请到 Account → Profile 设置。' },
        { type: 'h', text: '为什么 URL 后面多了 -2？' },
        { type: 'p', text: '该 URL 名在你的账户下已被占用。显示名称不变，数字后缀用于保持 URL 唯一。' },
        { type: 'h', text: '为什么链接返回 404？' },
        { type: 'p', text: '内容可能是私有的、已删除的，或属于其他账户。私有与已删除内容不会对访客开放。' },
        { type: 'h', text: '可以修改 URL 吗？' },
        { type: 'p', text: '不可以。slug 创建后固定，以保证链接稳定。' },
        { type: 'h', text: '如何删除内容？' },
        { type: 'p', text: '在个人主页、代码段页面或编辑页使用 Delete；分组可在个人主页或分组页面删除。' },
        { type: 'h', text: '谁能恢复已删除内容？' },
        { type: 'p', text: '站点管理员可以在后台恢复。请联系管理员并提供 URL。' }
      ]
    }
  }
]
