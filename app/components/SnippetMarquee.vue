<template>
  <section class="showcase" aria-label="Example snippets">
    <div class="marquee">
      <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="marquee-row"
        :class="rowIndex % 2 === 0 ? 'marquee-row--left' : 'marquee-row--right'">
        <div class="marquee-track" :style="{ animationDuration: rowIndex % 2 === 0 ? '60s' : '72s' }">
          <article v-for="(card, index) in [...row, ...row, ...row, ...row]" :key="`${rowIndex}-${index}`"
            class="snippet-card" :aria-hidden="index >= row.length ? 'true' : undefined">
            <header class="card-head">
              <span class="card-title">{{ card.title }}</span>
              <span class="card-lang">
                <img v-if="card.logo" class="lang-logo" :src="card.logo" alt="" width="13" height="13"
                  loading="lazy" decoding="async">
                {{ card.language }}
              </span>
            </header>

            <pre class="card-code"><code><template v-for="(token, tokenIndex) in card.tokens"
              :key="tokenIndex"><span :class="`tok-${token.type}`">{{ token.text }}</span></template></code></pre>

            <footer class="card-foot">
              <span v-for="dependency in card.dependencies" :key="dependency" class="card-dep">{{ dependency }}</span>
              <span v-if="!card.dependencies.length" class="card-dep card-dep--muted">stdlib</span>
            </footer>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 首页代码片段墙：两行反向无限循环（CSS 动画），悬停暂停
// 每行渲染 4 份：前两份构成一个宽度超过常见视口的「单元」，首屏就是满的，循环无接缝
// 片段是展示用静态样例；高亮是极简分词（关键字/字符串/数字/注释/函数），颜色随深浅色模式切换

type TokenType = 'plain' | 'kw' | 'str' | 'num' | 'com' | 'fn' | 'type' | 'punc'

interface CodeToken {
  text: string
  type: TokenType
}

interface SnippetCard {
  title: string
  language: string
  logo: string | null
  code: string
  dependencies: string[]
}

const SAMPLES: SnippetCard[] = [
  {
    title: 'Debounced ref',
    language: 'TypeScript',
    logo: 'https://cdn.simpleicons.org/typescript',
    dependencies: ['vue'],
    code: `const out = ref(value.value)
let timer: number
watch(value, next => {
  clearTimeout(timer)
  timer = window.setTimeout(
    () => (out.value = next), ms)
})
return out`
  },
  {
    title: 'Chunk a list',
    language: 'Python',
    logo: 'https://cdn.simpleicons.org/python',
    dependencies: [],
    code: `def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]

for batch in chunks(rows, 100):
    send(batch)`
  },
  {
    title: 'Retry with backoff',
    language: 'Rust',
    logo: 'https://cdn.simpleicons.org/rust',
    dependencies: ['tokio'],
    code: `let mut backoff = 100;
loop {
    if let Ok(res) = fetch().await {
        return Ok(res);
    }
    sleep(backoff).await;
    backoff *= 2;
}`
  },
  {
    title: 'Top tags',
    language: 'SQL',
    logo: 'https://cdn.simpleicons.org/postgresql',
    dependencies: ['postgresql'],
    code: `select name, count(*) as uses
from snippet_tags
group by name
order by uses desc
limit 10;`
  },
  {
    title: 'Worker pool',
    language: 'Go',
    logo: 'https://cdn.simpleicons.org/go',
    dependencies: [],
    code: `jobs := make(chan int, 8)
for i := 0; i < 4; i++ {
    go func() {
        for job := range jobs {
            process(job)
        }
    }()
}`
  },
  {
    title: 'Interval composable',
    language: 'Vue',
    logo: 'https://cdn.simpleicons.org/vuedotjs',
    dependencies: ['vue'],
    code: `const tick = ref(0)
const id = setInterval(() => {
  tick.value++
}, 1000)

onBeforeUnmount(() => {
  clearInterval(id)
})`
  },
  {
    title: 'Prune merged branches',
    language: 'Shell',
    logo: 'https://cdn.simpleicons.org/gnubash',
    dependencies: ['git'],
    code: `git fetch --prune
git branch -vv | grep ': gone]' \\
  | awk '{print $1}' \\
  | xargs -r git branch -D`
  },
  {
    title: 'Clamp to two lines',
    language: 'CSS',
    logo: 'https://cdn.simpleicons.org/css',
    dependencies: [],
    code: `.clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}`
  }
]

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'import', 'from', 'export', 'default', 'async', 'await',
  'if', 'else', 'for', 'of', 'in', 'new', 'class', 'extends', 'interface', 'type', 'as', 'def', 'fn',
  'pub', 'use', 'struct', 'impl', 'match', 'mut', 'self', 'true', 'false', 'null', 'undefined', 'void',
  'go', 'defer', 'chan', 'package', 'func', 'range', 'select', 'case', 'break', 'continue', 'while',
  'onBeforeUnmount', 'setInterval', 'clearInterval', 'clearTimeout', 'watch', 'ref', 'limit', 'group',
  'order', 'by', 'desc'
])

const TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$-]*)|\s+|([^\sA-Za-z0-9_$])/g

function tokenize(code: string): CodeToken[] {
  const tokens: CodeToken[] = []
  let lastIndex = 0
  const re = new RegExp(TOKEN_RE.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(code))) {
    if (match.index > lastIndex) tokens.push({ text: code.slice(lastIndex, match.index), type: 'plain' })
    const raw = match[0]
    const comment = match[1]
    const string = match[2]
    const number = match[3]
    const word = match[4]
    const punct = match[6]
    if (comment) tokens.push({ text: raw, type: 'com' })
    else if (string) tokens.push({ text: raw, type: 'str' })
    else if (number) tokens.push({ text: raw, type: 'num' })
    else if (word) {
      const next = code.slice(re.lastIndex).match(/^\s*\(/)
      if (KEYWORDS.has(word)) tokens.push({ text: raw, type: 'kw' })
      else if (/^[A-Z]/.test(word)) tokens.push({ text: raw, type: 'type' })
      else if (next) tokens.push({ text: raw, type: 'fn' })
      else tokens.push({ text: raw, type: 'plain' })
    } else if (punct) tokens.push({ text: raw, type: 'punc' })
    else tokens.push({ text: raw, type: 'plain' })
    lastIndex = re.lastIndex
  }
  if (lastIndex < code.length) tokens.push({ text: code.slice(lastIndex), type: 'plain' })
  return tokens
}

const cards = SAMPLES.map(sample => ({ ...sample, tokens: tokenize(sample.code) }))
const rows = [cards.slice(0, 4), cards.slice(4)]
</script>

<style scoped lang="scss">
.showcase {
  position: relative;
  margin-top: 7rem;
  padding-bottom: 2rem;
}

/* 两行反向无限循环：每行 4 份内容，位移 -50%（前两份为循环单元，首屏即为满的） */
.marquee {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
}

.marquee-row {
  overflow: hidden;
}

.marquee-track {
  display: flex;
  width: max-content;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;

  .marquee-row--left & {
    animation-name: marquee-left;
  }

  .marquee-row--right & {
    animation-name: marquee-right;
  }
}

@keyframes marquee-left {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes marquee-right {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}

.marquee:hover .marquee-track {
  animation-play-state: paused;
}

.snippet-card {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 19rem;
  min-height: 15rem;
  margin-right: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.9rem;
  background: var(--p-content-background);
  box-shadow: 0 16px 36px -30px rgba(0, 0, 0, 0.55);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.card-title {
  font-size: 0.86rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-lang {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  flex-shrink: 0;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--p-text-color) 8%, transparent);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

/* 深色模式下按全站约定反白（--logo-tint），不会被深色卡片吞掉 */
.lang-logo {
  width: 13px;
  height: 13px;
  object-fit: contain;
  filter: var(--logo-tint);
}

.card-code {
  flex: 1;
  margin: 0;
  padding: 0.7rem 0.75rem;
  overflow: hidden;
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--p-text-color) 4%, var(--p-content-background));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  line-height: 1.65;
  white-space: pre;
  tab-size: 2;

  code {
    font: inherit;
  }

  /* One Light */
  --tok-kw: #a626a4;
  --tok-str: #50a14f;
  --tok-num: #986801;
  --tok-com: #a0a1a7;
  --tok-fn: #4078f2;
  --tok-type: #c18401;
  --tok-punc: #7a7f87;
}

.tok-kw { color: var(--tok-kw); }
.tok-str { color: var(--tok-str); }
.tok-num { color: var(--tok-num); }
.tok-com { color: var(--tok-com); font-style: italic; }
.tok-fn { color: var(--tok-fn); }
.tok-type { color: var(--tok-type); }
.tok-punc { color: var(--tok-punc); }

@media (prefers-color-scheme: dark) {
  .card-code {
    /* One Dark */
    --tok-kw: #c678dd;
    --tok-str: #98c379;
    --tok-num: #d19a66;
    --tok-com: #7f848e;
    --tok-fn: #61afef;
    --tok-type: #e5c07b;
    --tok-punc: #8b909a;
  }
}

.card-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.7rem;
}

.card-dep {
  padding: 0.08rem 0.42rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.68rem;
  color: var(--p-text-muted-color);
}

.card-dep--muted {
  border-style: dashed;
}

@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
  }

  .marquee-row {
    overflow-x: auto;
  }
}
</style>
