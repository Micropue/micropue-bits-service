// 社区互动（收藏 / 举报 / 反馈 / 置顶）的共享常量与校验
// 前台只展示英文；控制台用 useConsoleI18n 的 report.type.* 翻译类型

export const MAX_PINNED_PER_KIND = 3

export type ReportTargetKind = 'user' | 'snippet' | 'group'

export const REPORT_STATUSES = ['pending', 'ignored', 'removed', 'restricted'] as const
export type ReportStatus = typeof REPORT_STATUSES[number]

export interface ModerationType {
  value: string
  label: string
}

export const REPORT_TYPES: Record<ReportTargetKind, readonly ModerationType[]> = {
  snippet: [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'abuse', label: 'Harassment or hate' },
    { value: 'malware', label: 'Malicious code' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'other', label: 'Other' }
  ],
  group: [
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'abuse', label: 'Harassment or hate' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'other', label: 'Other' }
  ],
  user: [
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'other', label: 'Other' }
  ]
}

export const FEEDBACK_TYPES: readonly ModerationType[] = [
  { value: 'broken', label: "Doesn't work" },
  { value: 'inaccurate', label: 'Inaccurate description' },
  { value: 'outdated', label: 'Outdated' },
  { value: 'other', label: 'Other' }
]

export function isReportTargetKind(value: unknown): value is ReportTargetKind {
  return value === 'user' || value === 'snippet' || value === 'group'
}

export function isValidReportType(kind: ReportTargetKind, value: unknown): boolean {
  return REPORT_TYPES[kind].some(item => item.value === value)
}

export function isValidFeedbackType(value: unknown): boolean {
  return FEEDBACK_TYPES.some(item => item.value === value)
}

export function moderationTypeLabel(list: readonly ModerationType[], value: string): string {
  return list.find(item => item.value === value)?.label ?? value
}
