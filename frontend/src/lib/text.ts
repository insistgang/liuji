/** 去掉例句里的 Markdown 强调标记，词卡按纯文本展示 */
export function plainText(markdown: string): string {
  return markdown.replace(/\*\*/g, '')
}
