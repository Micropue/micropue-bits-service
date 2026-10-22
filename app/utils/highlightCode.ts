// 极简代码高亮分词：关键字 / 字符串 / 数字 / 注释 / 函数 / 类型
// 用于首页代码墙与公开代码段详情（无第三方高亮库）；颜色由 .code-highlight 的 CSS 变量提供
export type CodeTokenType = 'plain' | 'kw' | 'str' | 'num' | 'com' | 'fn' | 'type' | 'punc'

export interface CodeToken {
  text: string
  type: CodeTokenType
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'import', 'from', 'export', 'default', 'async', 'await',
  'if', 'else', 'for', 'of', 'in', 'new', 'class', 'extends', 'interface', 'type', 'as', 'def', 'fn',
  'pub', 'use', 'struct', 'impl', 'match', 'mut', 'self', 'true', 'false', 'null', 'undefined', 'void',
  'go', 'defer', 'chan', 'package', 'func', 'range', 'select', 'case', 'break', 'continue', 'while',
  'try', 'catch', 'throw', 'switch', 'with', 'lambda', 'and', 'or', 'not', 'is', 'elif', 'yield',
  'onBeforeUnmount', 'setInterval', 'clearInterval', 'clearTimeout', 'watch', 'ref',
  'limit', 'group', 'order', 'by', 'desc'
])

const TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$-]*)|\s+|([^\sA-Za-z0-9_$])/g

export function tokenizeCode(code: string): CodeToken[] {
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
    // 正则里空白分支不是捕获组：注释/字符串/数字/单词之后的第 5 组才是标点
    const punct = match[5]

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
