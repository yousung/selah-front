const KEY = 'sermon-resume'

export interface SermonResumeData {
  videoId: string
  videoTitle: string
  categoryId?: string
  categoryTitle?: string
  position: number
  downloaded: boolean
  updatedAt: number
}

/**
 * 설교 이어듣기 저장 구조.
 * - items: 지금까지 들었던 설교들의 위치(설교별 1개씩).
 * - last: 마지막으로 들었던 설교 videoId. 설교 탭 진입 팝업은 이 값으로 판단.
 *         닫기 시 last만 null로 비우고 items는 유지한다.
 */
interface SermonResumeStore {
  items: SermonResumeData[]
  last: string | null
}

function readStore(): SermonResumeStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { items: [], last: null }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { items: [], last: null }

    // 신버전: { items, last }
    if (Array.isArray((parsed as any).items)) {
      const items = (parsed as any).items as SermonResumeData[]
      const last = typeof (parsed as any).last === 'string' ? (parsed as any).last : null
      return { items, last }
    }

    // 구버전 1: 단일 객체 { videoId, ... }
    if (typeof (parsed as any).videoId === 'string') {
      const old = parsed as any
      const item: SermonResumeData = { ...old, updatedAt: old.updatedAt ?? 0 }
      return { items: [item], last: item.videoId }
    }

    // 구버전 2: videoId → data 맵
    const vals = Object.values(parsed as Record<string, SermonResumeData>)
      .filter((v) => v && typeof (v as any).videoId === 'string')
    if (vals.length) {
      const last = vals.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a)).videoId
      return { items: vals, last }
    }

    return { items: [], last: null }
  } catch {
    return { items: [], last: null }
  }
}

function writeStore(store: SermonResumeStore) {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch {}
}

/** 5초 버킷 내림. */
function bucket(pos: number): number {
  return Math.max(0, Math.floor(pos / 5) * 5)
}

/** 설교 위치 upsert. 위치는 5초 버킷으로 저장하고, last를 이 설교로 갱신한다. */
export function saveSermonResume(
  data: Omit<SermonResumeData, 'updatedAt' | 'position'> & { position: number },
) {
  const store = readStore()
  const entry: SermonResumeData = { ...data, position: bucket(data.position), updatedAt: Date.now() }
  const idx = store.items.findIndex((i) => i.videoId === data.videoId)
  if (idx >= 0) store.items[idx] = entry
  else store.items.push(entry)
  store.last = data.videoId
  writeStore(store)
}

/** 특정 설교 저장 위치(배열에서 조회). */
export function getSermonResume(videoId: string): SermonResumeData | null {
  return readStore().items.find((i) => i.videoId === videoId) ?? null
}

/** 마지막으로 들었던 설교(설교 탭 팝업용). last가 null이면 null. */
export function getLastSermonResume(): SermonResumeData | null {
  const store = readStore()
  if (!store.last) return null
  return store.items.find((i) => i.videoId === store.last) ?? null
}

/** 설교 탭 팝업 닫기: last만 null로 비우고 배열(items)은 유지. */
export function dismissSermonLast() {
  const store = readStore()
  if (store.last === null) return
  store.last = null
  writeStore(store)
}

/**
 * videoId 주면 해당 설교만 배열에서 삭제(매칭되면 last도 비움).
 * 무인자면 전체 삭제(다운로드 전체삭제·모드변경 시 사용).
 */
export function clearSermonResume(videoId?: string) {
  if (videoId == null) { try { localStorage.removeItem(KEY) } catch {}; return }
  const store = readStore()
  const next: SermonResumeStore = {
    items: store.items.filter((i) => i.videoId !== videoId),
    last: store.last === videoId ? null : store.last,
  }
  writeStore(next)
}
