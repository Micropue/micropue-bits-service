import { randomBytes } from 'node:crypto'

// 短 UUID：16 位小写 base36（80bit 随机熵），索引项 16B、大小写敏感
// 所有内容表的主键 sid 统一由它生成；撞唯一键时调用方重新生成即可
// 规范详见 项目综合设计.md「二、数据结构与开发规范」
export function shortId(): string {
  return BigInt(`0x${randomBytes(10).toString('hex')}`).toString(36).padStart(16, '0')
}
