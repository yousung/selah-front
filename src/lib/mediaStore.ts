import { useSettingsStore } from '@/store/settingsStore'
import { clearSermonResume } from '@/lib/sermonResume'

const DB_NAME = 'selah-media'
const DB_VERSION = 1

export interface FileEntry {
  id: string
  filename: string
  mimeType: string
  size: number
  downloadedAt: number
  lastPlayedAt: number
  status: 'downloading' | 'complete'
}

export interface StorageInfo {
  used: number
  limit: number | null
  count: number
  entries: FileEntry[]
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('positions')) {
        db.createObjectStore('positions', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(req.result) }
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(store: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

async function idbClear(store: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── OPFS helpers ──────────────────────────────────────────────────────────────

async function getMediaDir(create = false): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle('media', { create })
}

// ── Public utils ──────────────────────────────────────────────────────────────

export function isPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage.getDirectory === 'function'
  )
}

export function isOfflineMediaSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    isOpfsSupported() &&
    'indexedDB' in window &&
    'serviceWorker' in navigator &&
    typeof ReadableStream !== 'undefined' &&
    typeof AbortController !== 'undefined'
  )
}

export function canInstallPwa(): boolean {
  if (typeof window === 'undefined') return false
  if (isPwa()) return true
  if ('BeforeInstallPromptEvent' in window) return true
  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua)
  return isIos && isSafari
}

export function getServiceWorkerMediaUrl(id: string, type: 'audio' | 'video'): string {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}media/${encodeURIComponent(`${id}-${type}`)}`
}

export function canUseServiceWorkerMediaUrl(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller != null
  )
}

export async function isMediaCached(id: string, type: 'audio' | 'video'): Promise<boolean> {
  if (!isOpfsSupported()) return false
  try {
    const entry = await idbGet<FileEntry>('files', `${id}-${type}`)
    return entry?.status === 'complete'
  } catch {
    return false
  }
}

export async function getMediaBlobUrl(id: string, type: 'audio' | 'video'): Promise<string | null> {
  if (!isOpfsSupported()) return null
  try {
    const entry = await idbGet<FileEntry>('files', `${id}-${type}`)
    if (!entry || entry.status !== 'complete') return null
    const root = await navigator.storage.getDirectory()
    const mediaDir = await root.getDirectoryHandle('media', { create: false })
    const fileHandle = await mediaDir.getFileHandle(entry.filename)
    const file = await fileHandle.getFile()
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

export async function getCachedMediaPlaybackUrl(id: string, type: 'audio' | 'video'): Promise<string | null> {
  if (!isOpfsSupported()) return null

  try {
    const entry = await idbGet<FileEntry>('files', `${id}-${type}`)
    if (!entry || entry.status !== 'complete') return null

    if (canUseServiceWorkerMediaUrl()) {
      const swUrl = getServiceWorkerMediaUrl(id, type)
      try {
        const probe = await fetch(swUrl, { headers: { Range: 'bytes=0-0' } })
        if (probe.status === 206) {
          if (probe.body) await probe.body.cancel().catch(() => {})
          return swUrl
        }
      } catch {}
    }
  } catch {
    return null
  }

  return getMediaBlobUrl(id, type)
}

// ── Core API ──────────────────────────────────────────────────────────────────

export async function resolveSrc(id: string, cdnUrl: string, type: 'audio' | 'video'): Promise<string> {
  if (!isOpfsSupported()) return cdnUrl
  const cachedUrl = await getCachedMediaPlaybackUrl(id, type)
  return cachedUrl ?? cdnUrl
}

export async function deleteMedia(id: string, type?: 'audio' | 'video'): Promise<void> {
  const keys = type ? [`${id}-${type}`] : [`${id}-audio`, `${id}-video`]
  for (const key of keys) {
    await idbDelete('files', key)
    try {
      const mediaDir = await getMediaDir(false)
      await mediaDir.removeEntry(key)
    } catch {}
  }
}

async function evictByCacheKey(cacheKey: string): Promise<void> {
  await idbDelete('files', cacheKey)
  try {
    const dir = await getMediaDir(false)
    await dir.removeEntry(cacheKey)
  } catch {}
}

async function evictToLimit(excludeKey: string): Promise<void> {
  const { offlineStorageMode } = useSettingsStore.getState()
  if (offlineStorageMode === 'thrift') return

  const all = await idbGetAll<FileEntry>('files')
  const complete = all
    .filter((f) => f.status === 'complete' && f.id !== excludeKey)
    .sort((a, b) => a.lastPlayedAt - b.lastPlayedAt)

  const limitBytes =
    offlineStorageMode === 'custom'
      ? 2 * 1024 * 1024 * 1024
      : offlineStorageMode === 'generous'
        ? 1 * 1024 * 1024 * 1024
        : 500 * 1024 * 1024

  let totalUsed = complete.reduce((sum, f) => sum + f.size, 0)
  for (const f of complete) {
    if (totalUsed <= limitBytes) break
    await evictByCacheKey(f.id)
    totalUsed -= f.size
  }
}

// 진행 중인 다운로드 취소용 레지스트리 (cacheKey → AbortController)
const _activeDownloads = new Map<string, AbortController>()

/** 진행 중인 다운로드 취소 (미니 플레이어 닫기 등). 없으면 no-op. */
export function cancelDownload(id: string, type: 'audio' | 'video'): void {
  _activeDownloads.get(`${id}-${type}`)?.abort()
}

export async function downloadMedia(
  id: string,
  cdnUrl: string,
  opts: { onProgress?: (pct: number) => void; type?: 'audio' | 'video'; estimatedSize?: number } = {},
): Promise<void> {
  if (!isOfflineMediaSupported()) throw new Error('Offline media is not supported on this device')

  const { offlineStorageMode } = useSettingsStore.getState()
  if (offlineStorageMode === 'thrift') throw new Error('Storage disabled in thrift mode')

  const mediaType = opts.type ?? 'audio'
  const cacheKey = `${id}-${mediaType}`

  const existing = await idbGet<FileEntry>('files', cacheKey)
  if (existing?.status === 'complete') return

  if (existing?.status === 'downloading') {
    // 최근(60초 이내) 락이면 다른 다운로드가 진행 중 — 백오프(파일 손상 방지)
    if (Date.now() - existing.downloadedAt < 60_000) return
    // 오래된 락은 앱 강제 종료로 남은 것 — 초기화 후 재다운로드
    await idbDelete('files', cacheKey)
    try {
      const dir = await getMediaDir(false)
      await dir.removeEntry(cacheKey)
    } catch {}
  }

  const mimeType = mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'
  const now = Date.now()

  await idbPut('files', {
    id: cacheKey,
    filename: cacheKey,
    mimeType,
    size: 0,
    downloadedAt: now,
    lastPlayedAt: now,
    status: 'downloading',
  } as FileEntry)

  // 취소 가능하도록 컨트롤러 등록 (cancelDownload로 중단)
  const abortController = new AbortController()
  _activeDownloads.set(cacheKey, abortController)

  let writable: FileSystemWritableFileStream | null = null
  try {
    // 한방 다운로드: Range 청크 불필요. 이 CDN(Invidious latest_version → googlevideo)은
    //   단일 연결을 throttle하지 않아 측정상 한방 스트림이 청크보다 빠름(요청 오버헤드 0).
    // no-Range fetch → body 스트림을 OPFS에 흘려 씀(요청 1회, 저메모리 — 전체를 메모리에 안 올림).
    // 총 크기는 CORS로 헤더(Content-Length)가 가려질 수 있어, 없으면 추정크기로 진행률 표시.
    const res = await fetch(cdnUrl, { signal: abortController.signal })
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    if (!res.body) throw new Error('No response body')

    const mediaDir = await getMediaDir(true)
    const fileHandle = await mediaDir.getFileHandle(cacheKey, { create: true })
    writable = await fileHandle.createWritable()

    const estTotal = opts.estimatedSize && opts.estimatedSize > 0 ? opts.estimatedSize : 0
    const headerTotal = parseInt(res.headers.get('Content-Length') ?? '0')
    let received = 0
    const reader = res.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await writable.write(value)
      received += value.byteLength
      // 실제 총량(Content-Length)을 알면 그걸로, 모르면 추정크기로(0.99 캡, 완료 시 1로 스냅)
      if (headerTotal > 0) opts.onProgress?.(Math.min(0.999, received / headerTotal))
      else if (estTotal > 0) opts.onProgress?.(Math.min(0.99, received / estTotal))
    }

    await writable.close()
    writable = null

    await idbPut('files', {
      id: cacheKey,
      filename: cacheKey,
      mimeType,
      size: received,
      downloadedAt: now,
      lastPlayedAt: now,
      status: 'complete',
    } as FileEntry)

    opts.onProgress?.(1)

    await evictToLimit(cacheKey)
  } catch (err) {
    // 취소/에러 시 열린 writable 닫고 부분 파일·락 정리 (다음 시도가 깨끗하게 재시작)
    try { await writable?.abort() } catch {}
    await idbDelete('files', cacheKey)
    try {
      const dir = await getMediaDir(false)
      await dir.removeEntry(cacheKey)
    } catch {}
    throw err
  } finally {
    _activeDownloads.delete(cacheKey)
  }
}

export async function updateLastPlayed(id: string): Promise<void> {
  const entry = await idbGet<FileEntry>('files', id)
  if (entry) await idbPut('files', { ...entry, lastPlayedAt: Date.now() })
}

// Throttle: save at most once every 5s per id
const _positionThrottle = new Map<string, ReturnType<typeof setTimeout>>()

export async function savePosition(id: string, currentTime: number): Promise<void> {
  const { offlineStorageMode } = useSettingsStore.getState()
  if (offlineStorageMode === 'thrift') return
  if (!isPwa()) return

  const existing = _positionThrottle.get(id)
  if (existing) return

  _positionThrottle.set(
    id,
    setTimeout(() => _positionThrottle.delete(id), 5000),
  )

  await idbPut('positions', { id, currentTime, updatedAt: Date.now() })
}

export async function loadPosition(id: string): Promise<number> {
  const { offlineStorageMode } = useSettingsStore.getState()
  if (offlineStorageMode === 'thrift') return 0
  if (!isPwa()) return 0

  try {
    const entry = await idbGet<{ id: string; currentTime: number }>('positions', id)
    return entry?.currentTime ?? 0
  } catch {
    return 0
  }
}

export async function storageInfo(): Promise<StorageInfo> {
  const { offlineStorageMode, offlineStorageCustomMB } = useSettingsStore.getState()
  const entries = await idbGetAll<FileEntry>('files')
  const complete = entries.filter((f) => f.status === 'complete')
  const used = complete.reduce((sum, f) => sum + f.size, 0)

  let limit: number | null
  if (offlineStorageMode === 'thrift') limit = 0
  else if (offlineStorageMode === 'normal') limit = null
  else if (offlineStorageMode === 'generous') limit = 1 * 1024 * 1024 * 1024
  else limit = offlineStorageCustomMB * 1024 * 1024

  return { used, limit, count: complete.length, entries: complete }
}

export async function clearAllMedia(): Promise<void> {
  const entries = await idbGetAll<FileEntry>('files')
  try {
    const root = await navigator.storage.getDirectory()
    const mediaDir = await root.getDirectoryHandle('media', { create: false })
    await Promise.all(
      entries.map((e) => mediaDir.removeEntry(e.filename).catch(() => {})),
    )
  } catch {}
  await idbClear('files')
  await idbClear('positions')
  // 다운로드 모두 지우기 시 이어듣기 저장소도 무효화 (완료 상태가 더는 유효하지 않음)
  clearSermonResume()
}
