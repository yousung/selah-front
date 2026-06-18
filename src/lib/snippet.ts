export function makeSnippet(content: string, q?: string, len = 120): string {
  if (!content) return ''
  if (!q) return content.length > len ? content.slice(0, len) + '…' : content
  const idx = content.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return content.length > len ? content.slice(0, len) + '…' : content
  const start = Math.max(0, idx - 40)
  const end = Math.min(content.length, start + len)
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '')
}
