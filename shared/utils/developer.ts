// Developer 删除操作的高风险确认短语：前后端共用
export const DEVELOPER_DELETE_PHRASE = 'I confirm deletion'

export function isDeveloperDeletePhrase(value: unknown): boolean {
  return value === DEVELOPER_DELETE_PHRASE
}
