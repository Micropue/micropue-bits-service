// 关键词搜索共用工具：空格拆分、每个关键词之间 AND（跨名称 / 介绍 / 标签 / 依赖 / 语言）
// 供指令框（/snippet、/group、/user）、目录页搜索与个人主页列表搜索复用

export function keywordTerms(value: unknown, max = 5): string[] {
  return String(value ?? '')
    .trim()
    .slice(0, 120)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map(term => term.slice(0, 32))
}

export function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, char => `\\${char}`)}%`
}

// 代码段：名称 / 介绍 / 标签 / 依赖 / 语言；查询里必须有 languages 的 l 别名
export function snippetKeywordCondition(term: string, params: (string | number)[], alias = 'c'): string {
  const pattern = likePattern(term)
  params.push(pattern, pattern, pattern, pattern, pattern, pattern)
  return `(${alias}.\`name\` LIKE ? OR ${alias}.\`intro\` LIKE ? OR l.\`name\` LIKE ?
    OR EXISTS (
      SELECT 1 FROM \`content_tags\` ct
      JOIN \`tags\` t ON t.\`sid\` = ct.\`tag_sid\`
      WHERE ct.\`content_sid\` = ${alias}.\`sid\` AND (t.\`name\` LIKE ? OR t.\`tag_key\` LIKE ?)
    )
    OR EXISTS (
      SELECT 1 FROM \`snippet_dependencies\` sd
      JOIN \`dependencies\` d ON d.\`sid\` = sd.\`dependency_sid\`
      WHERE sd.\`snippet_sid\` = ${alias}.\`sid\` AND d.\`name\` LIKE ?
    ))`
}

// 分组：名称 / 介绍 / 标签
export function groupKeywordCondition(term: string, params: (string | number)[], alias = 'g'): string {
  const pattern = likePattern(term)
  params.push(pattern, pattern, pattern, pattern)
  return `(${alias}.\`name\` LIKE ? OR ${alias}.\`intro\` LIKE ?
    OR EXISTS (
      SELECT 1 FROM \`content_tags\` ct
      JOIN \`tags\` t ON t.\`sid\` = ct.\`tag_sid\`
      WHERE ct.\`content_sid\` = ${alias}.\`sid\` AND (t.\`name\` LIKE ? OR t.\`tag_key\` LIKE ?)
    ))`
}

// 用户：用户名 / 昵称
export function userKeywordCondition(term: string, params: (string | number)[], alias = 'u'): string {
  const pattern = likePattern(term)
  params.push(pattern, pattern)
  return `(${alias}.\`username\` LIKE ? OR ${alias}.\`nickname\` LIKE ?)`
}
