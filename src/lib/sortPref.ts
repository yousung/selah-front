export type SortMode = 'chapterAsc' | 'chapterDesc'

const key = (scope: string, id: string) => `sortPref:${scope}:${id}`

export function getSortPref(scope: string, id: string | undefined): SortMode {
  if (!id) return 'chapterAsc'
  try {
    return localStorage.getItem(key(scope, id)) === 'chapterDesc' ? 'chapterDesc' : 'chapterAsc'
  } catch {
    return 'chapterAsc'
  }
}

export function setSortPref(scope: string, id: string | undefined, mode: SortMode): void {
  if (!id) return
  try {
    localStorage.setItem(key(scope, id), mode)
  } catch {
    /* localStorage 비활성(사파리 프라이빗 등) 시 무시 */
  }
}
