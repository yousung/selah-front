export function isSearchable(q: string): boolean {
  const s = q.trim()
  if (!s) return false
  return /^\d+$/.test(s) ? s.length >= 1 : s.length >= 2
}
