import { useSettingsStore } from '@/store/settingsStore'
import { clearSermonResume } from '@/lib/sermonResume'

const DB_NAME = 'selah-media'
const DB_VERSION = 1
const CACHE_FORMAT_VERSION = 2

export interface FileEntry {
  id: string
  filename: string
  mimeType: string
  size: number
  downloadedAt: number
  lastPlayedAt: number
  status: 'downloading' | 'complete'
  formatVersion?: number
  /** 저장 목록(설정 → 저장된 컨텐츠) 표시용 메타. 오프라인에서도 제목을 보이려고 목록 첫 조회 때 채운다. */
  meta?: SavedMediaMeta
  /** 비디오 모드 저장분(`-video`와 그 짝 `-audio`)의 SegmentBase 정보 — 로컬 DASH 매니페스트 재료. */
  track?: DashTrack
  /**
   * `-audio` 파일을 저장한 주체. 비디오 저장은 짝 오디오가 필요해서 같은 `-audio` 파일을 공유한다.
   * 없으면 `['audio']`(오디오 모드 저장분 — 이 필드 도입 전 엔트리 포함). `-video` 엔트리엔 없다.
   */
  ownedBy?: MediaOwner[]
}

export type MediaOwner = 'audio' | 'video'

export interface DashTrack {
  /** codecs 포함 (`video/mp4; codecs="avc1.4D401E"`) */
  mimeType: string
  /** SegmentBase Initialization 범위 ("0-740") */
  init: string
  /** SegmentBase indexRange (sidx, "741-4708") */
  index: string
  bitrate: number
  width?: number
  height?: number
  /** 초(소수). 매니페스트 mediaPresentationDuration */
  duration?: number
}

/** 백엔드 `GET /videos/:id/download` 응답 (backend/docs/routes.md) */
export interface VideoDownloadTrackInfo {
  url: string
  itag: string
  mimeType: string
  init: string
  index: string
  bitrate: number
  clen: number
  width?: number
  height?: number
}

export interface VideoDownloadInfo {
  video: VideoDownloadTrackInfo
  audio: VideoDownloadTrackInfo
  duration: number | null
}

export interface SavedMediaMeta {
  title: string
  thumbnail: string | null
  type: string | null
}

export interface StorageInfo {
  used: number
  limit: number | null
  count: number
  entries: FileEntry[]
}

export const MEDIA_DOWNLOADED_EVENT = 'selah-media-downloaded'

export interface MediaDownloadedDetail {
  id: string
  type: 'audio' | 'video'
  cacheKey: string
}

// 저장(다운로드) 파일이 손상됐다고 판정됐을 때(캐시 재생 후 3초간 진행 없음) 발화.
// AudioContext가 손상 파일을 삭제한 뒤 쏘고, PlayerPage가 받아 메시지 표시 + 재다운로드한다.
export const MEDIA_CORRUPT_EVENT = 'selah-media-corrupt'

export interface MediaCorruptDetail {
  id: string
  type: 'audio' | 'video'
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

async function removeMediaCacheKey(cacheKey: string): Promise<void> {
  _fileCache.delete(cacheKey)
  await idbDelete('files', cacheKey)
  try {
    const mediaDir = await getMediaDir(false)
    await mediaDir.removeEntry(cacheKey)
  } catch {}
}

function mediaTypeFromCacheKey(cacheKey: string): 'audio' | 'video' {
  return cacheKey.endsWith('-video') ? 'video' : 'audio'
}

function idFromCacheKey(cacheKey: string): string {
  return cacheKey.slice(0, -(mediaTypeFromCacheKey(cacheKey).length + 1))
}

/** `-audio` 엔트리의 소유자. 필드가 없으면 오디오 모드 저장분이다. */
export function audioOwnersOf(entry: FileEntry): MediaOwner[] {
  return entry.ownedBy ?? ['audio']
}

/** 비디오 저장의 짝으로만 존재하는 `-audio`(오디오 모드에선 저장한 적 없음) — 저장 목록·저장됨 표시에서 숨긴다. */
export function isVideoOnlyCompanion(entry: FileEntry): boolean {
  if (mediaTypeFromCacheKey(entry.id) !== 'audio') return false
  const owners = audioOwnersOf(entry)
  return !owners.includes('audio')
}

function withOwner(owners: MediaOwner[], owner: MediaOwner): MediaOwner[] {
  return owners.includes(owner) ? owners : [...owners, owner]
}

function isLegacyAudioCache(entry: FileEntry, type: 'audio' | 'video'): boolean {
  return type === 'audio' && entry.mimeType === 'audio/mpeg' && entry.formatVersion !== CACHE_FORMAT_VERSION
}

function canPlayDownloadedMime(type: 'audio' | 'video', mimeType: string): boolean {
  if (typeof document === 'undefined') return true
  const media = document.createElement(type)
  return media.canPlayType(mimeType) !== ''
}

export function isIosWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * 데스크탑(및 iPadOS 데스크탑 UA) Safari. Chrome/Edge/iOS 제외.
 * Safari는 Service-Worker가 가로챈 미디어(/media range) fetch가 응답을 안 주고
 * hang하는 케이스가 있어, 다운로드 파일을 SW 경유로 재생하면 무한 로딩/재생 불가가 된다.
 * 데스크탑 Safari는 메모리 여유가 있어 blob URL 직접 재생이 안전하다.
 */
export function isDesktopSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPod/i.test(ua)) return false
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/i.test(ua)
}

async function getUsableCompleteEntry(id: string, type: 'audio' | 'video'): Promise<FileEntry | null> {
  const cacheKey = `${id}-${type}`
  const entry = await idbGet<FileEntry>('files', cacheKey)
  if (!entry || entry.status !== 'complete') return null
  if (isLegacyAudioCache(entry, type)) {
    await removeMediaCacheKey(cacheKey)
    return null
  }
  return entry
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

/**
 * 영속 저장소(persistent storage) 권한을 요청한다. 부트스트랩 1회 호출.
 * 요청하지 않으면 OPFS/IDB는 best-effort 저장소로 취급되어 브라우저가 세션 간
 * (특히 비설치 탭/Safari, 저장 압박 시) 임의로 evict한다 → 다운로드한 곡이 새로고침
 * 후 사라져 재다운로드된다. persist()로 durable 저장을 확보해 이를 방지한다.
 * 이미 부여됐으면 재요청하지 않는다. 반환값은 영속 보장 여부.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') return false
    if (typeof navigator.storage.persisted === 'function' && (await navigator.storage.persisted())) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
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

function notifyMediaDownloaded(detail: MediaDownloadedDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MEDIA_DOWNLOADED_EVENT, { detail }))
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

/**
 * 타임아웃 있는 fetch. Safari에선 SW가 fetch를 가로챈 뒤 응답을 영영 안 주는
 * 케이스가 있어, 타임아웃 없는 fetch가 재생을 무한 블록한다(무한 로딩 버그).
 * 타임아웃 초과 시 abort → reject 되어 호출부가 폴백 경로로 진행할 수 있다.
 */
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 콜드런치/첫 설치/SW 업데이트 직후엔 navigator.serviceWorker.controller가 잠시 null인
 * 윈도우가 있다. 그 사이 다운로드된 미디어가 스트림으로 폴백되는 걸 막기 위해, SW가
 * 페이지 제어를 확보할 때까지 (timeoutMs 내) 기다린다. 제어 확보 여부를 반환.
 */
export async function ensureServiceWorkerControl(timeoutMs = 3000): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  const sw = navigator.serviceWorker
  if (sw.controller) return true
  // 등록된 SW가 하나도 없으면 제어가 잡힐 길이 없다 → 즉시 false 반환(dev 등에서 불필요한 3초 대기 제거).
  // 프로덕션은 SW가 등록돼 있어 regs.length>0 → 아래 정상 대기 경로를 탄다.
  try {
    const regs = await sw.getRegistrations()
    if (regs.length === 0) return false
  } catch {}
  // 전체 대기를 timeoutMs로 단일 상한한다. navigator.serviceWorker.ready는 등록된 SW가
  // 없으면(예: dev 서버, SW 등록 실패) 영영 resolve되지 않으므로, 타임아웃 없이 await하면
  // getCachedMediaPlaybackUrl가 멈춰 저장(다운로드) 미디어 재생이 무한 로딩으로 hang한다
  // (blob 폴백에 끝내 도달 못 함). controllerchange / ready(제어 확보) / 타임아웃을 레이스해
  // SW가 없으면 timeoutMs 내 false로 빠져나가 blob 폴백 재생이 진행되도록 한다.
  return await new Promise<boolean>((resolve) => {
    let settled = false
    const done = (v: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      sw.removeEventListener('controllerchange', onChange)
      resolve(v)
    }
    const onChange = () => done(true)
    const timer = setTimeout(() => done(!!sw.controller), timeoutMs)
    sw.addEventListener('controllerchange', onChange)
    // 등록된 SW가 있으면 active 직후 controller가 잡힌다. ready가 영영 resolve되지 않는
    // 환경에서는 이 then이 그냥 매달려 있고(부작용 없음) 타임아웃이 대기를 끝낸다.
    sw.ready.then(() => { if (sw.controller) done(true) }).catch(() => {})
  })
}

export async function isMediaCached(id: string, type: 'audio' | 'video'): Promise<boolean> {
  if (!isOpfsSupported()) return false
  try {
    const entry = await getUsableCompleteEntry(id, type)
    if (type === 'audio') return entry != null && audioOwnersOf(entry).includes('audio')
    // 비디오는 짝 오디오까지 있어야 재생된다(두 파일을 로컬 DASH로 합친다).
    return (await getLocalVideoPair(id)) != null
  } catch {
    return false
  }
}

async function getLocalVideoPair(id: string): Promise<{ video: FileEntry & { track: DashTrack }; audio: FileEntry & { track: DashTrack } } | null> {
  const video = await getUsableCompleteEntry(id, 'video')
  const audio = await getUsableCompleteEntry(id, 'audio')
  if (!video?.track || !audio?.track || !audioOwnersOf(audio).includes('video')) return null
  return { video: video as FileEntry & { track: DashTrack }, audio: audio as FileEntry & { track: DashTrack } }
}

// ── 로컬 DASH (비디오 모드 저장분 재생) ──────────────────────────────────────────
// 저장된 video-only + audio-only 두 파일을 정적 MPD 하나로 묶어 shaka에 먹인다. 미디어 엘리먼트 하나로
// 소리·화면·seek이 같이 돈다. BaseURL은 커스텀 스킴이고 dashPlayer가 등록한 스킴 플러그인이
// Range 요청마다 OPFS 파일을 slice해 돌려준다(네트워크·SW 불필요).

export const LOCAL_MEDIA_SCHEME = 'selah-file'
const LOCAL_MEDIA_PREFIX = `${LOCAL_MEDIA_SCHEME}://media/`

export function localMediaUri(cacheKey: string): string {
  return `${LOCAL_MEDIA_PREFIX}${encodeURIComponent(cacheKey)}`
}

export function cacheKeyFromLocalMediaUri(uri: string): string | null {
  return uri.startsWith(LOCAL_MEDIA_PREFIX) ? decodeURIComponent(uri.slice(LOCAL_MEDIA_PREFIX.length)) : null
}

// 재생 중 Range 요청마다 IDB/OPFS 핸들을 다시 여는 비용을 피한다. 삭제 시 removeMediaCacheKey가 비운다.
const _fileCache = new Map<string, File>()

/** 완료된 저장 파일(OPFS)을 File로 연다. 없으면 null. */
export async function getMediaFile(cacheKey: string): Promise<File | null> {
  const cached = _fileCache.get(cacheKey)
  if (cached) return cached
  try {
    const entry = await idbGet<FileEntry>('files', cacheKey)
    if (!entry || entry.status !== 'complete') return null
    const mediaDir = await getMediaDir(false)
    const file = await (await mediaDir.getFileHandle(entry.filename)).getFile()
    _fileCache.set(cacheKey, file)
    return file
  } catch {
    return null
  }
}

function xmlAttr(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function dashRepresentation(cacheKey: string, track: DashTrack, kind: 'video' | 'audio'): string {
  const mime = track.mimeType.split(';')[0].trim() || `${kind}/mp4`
  const codecs = /codecs="?([^";]+)"?/i.exec(track.mimeType)?.[1]
  const size = kind === 'video' && track.width && track.height ? ` width="${track.width}" height="${track.height}"` : ''
  return (
    `<AdaptationSet id="${kind === 'video' ? 1 : 0}" mimeType="${xmlAttr(mime)}" contentType="${kind}" startWithSAP="1" subsegmentAlignment="true">` +
    `<Representation id="${kind}" bandwidth="${Math.max(1, Math.round(track.bitrate))}"${codecs ? ` codecs="${xmlAttr(codecs)}"` : ''}${size}>` +
    `<BaseURL>${xmlAttr(localMediaUri(cacheKey))}</BaseURL>` +
    `<SegmentBase indexRange="${xmlAttr(track.index)}"><Initialization range="${xmlAttr(track.init)}"/></SegmentBase>` +
    `</Representation></AdaptationSet>`
  )
}

/**
 * 비디오 모드 저장분(`-video` + 짝 `-audio`)이 둘 다 있으면 로컬 DASH 매니페스트를 만든다. 없으면 null.
 * 형태는 Invidious `/api/manifest/dash`(셀라가 스트림 재생에 쓰는 것)를 따른다.
 */
export async function buildLocalDashManifest(id: string): Promise<{ manifest: string; duration: number | null } | null> {
  if (!isOpfsSupported()) return null
  try {
    const pair = await getLocalVideoPair(id)
    if (!pair) return null
    const duration = pair.video.track.duration ?? pair.audio.track.duration ?? null
    const manifest =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" minBufferTime="PT1.500S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static"' +
      (duration ? ` mediaPresentationDuration="PT${duration}S"` : '') + '>' +
      '<Period>' +
      dashRepresentation(pair.audio.id, pair.audio.track, 'audio') +
      dashRepresentation(pair.video.id, pair.video.track, 'video') +
      '</Period></MPD>'
    return { manifest, duration }
  } catch {
    return null
  }
}

export interface MediaEntryPeek {
  found: boolean
  status: FileEntry['status'] | null
  filename: string | null
  size: number | null
}

/**
 * 진단 전용: IDB 엔트리를 부작용 없이 읽어 상태만 보고한다.
 * (getUsableCompleteEntry는 레거시 엔트리를 삭제하는 부작용이 있어 진단에 쓰면 안 됨.)
 */
export async function peekMediaEntry(id: string, type: 'audio' | 'video'): Promise<MediaEntryPeek> {
  try {
    const entry = await idbGet<FileEntry>('files', `${id}-${type}`)
    if (!entry) return { found: false, status: null, filename: null, size: null }
    return {
      found: true,
      status: entry.status ?? null,
      filename: entry.filename ?? null,
      size: typeof entry.size === 'number' ? entry.size : null,
    }
  } catch {
    return { found: false, status: null, filename: null, size: null }
  }
}

export async function getMediaBlobUrl(id: string, type: 'audio' | 'video'): Promise<string | null> {
  if (!isOpfsSupported()) return null
  try {
    const entry = await getUsableCompleteEntry(id, type)
    if (!entry) return null
    const root = await navigator.storage.getDirectory()
    const mediaDir = await root.getDirectoryHandle('media', { create: false })
    const fileHandle = await mediaDir.getFileHandle(entry.filename)
    const file = await fileHandle.getFile()
    const source = entry.mimeType && file.type !== entry.mimeType
      ? new Blob([file], { type: entry.mimeType })
      : file
    return URL.createObjectURL(source)
  } catch {
    return null
  }
}

export async function getCachedMediaPlaybackUrl(id: string, type: 'audio' | 'video'): Promise<string | null> {
  if (!isOpfsSupported()) return null

  try {
    const entry = await getUsableCompleteEntry(id, type)
    if (!entry) return null

    // 데스크탑 Safari는 SW 경유 미디어 fetch가 hang하는 케이스가 있어(무한 로딩/재생 불가),
    // SW 경로를 건너뛰고 blob URL로 바로 재생한다.
    if (isDesktopSafari()) {
      const blobUrl = await getMediaBlobUrl(id, type)
      if (blobUrl) return blobUrl
      // blob 실패 시에만 아래 SW 경로로 폴백.
    }

    // 다운로드된 콘텐츠만 SW 제어 확보를 기다린다 (다운로드 안 된 건 위에서 이미 null 반환됨).
    // 콜드런치/첫 설치/SW 업데이트 직후 controller가 null인 윈도우에서도 로컬 재생을 보장.
    await ensureServiceWorkerControl()

    if (canUseServiceWorkerMediaUrl()) {
      const swUrl = getServiceWorkerMediaUrl(id, type)
      // probe 1회 + 짧은 1회 재시도: controller가 방금 확보됐어도 SW가 첫 fetch를
      // 가로채지 못하는 찰나가 있어, 한 번 실패하면 잠깐 뒤 다시 시도한다.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // 타임아웃 필수: Safari SW hang 시 무한 로딩 방지. 실패하면 아래 blob 폴백으로.
          const probe = await fetchWithTimeout(swUrl, { headers: { Range: 'bytes=0-0' } })
          if (probe.status === 206) {
            // SW가 실제 OPFS 미디어를 서빙하는지 검증한다. dev(SW 미디어 핸들러 미동작)나
            // SW 폴백이 SPA index.html(text/html, 수 KB)을 206으로 돌려주는 케이스가 있어,
            // status만 보면 가짜 응답을 미디어로 오인 → audio가 SRC_NOT_SUPPORTED로 터지고
            // "재생 오류"가 뜬다. Content-Range 총 크기가 엔트리 크기와 일치할 때만 SW URL을
            // 신뢰하고, 불일치하면 break → 아래 blob 경로로 OPFS 파일을 직접 재생한다.
            const totalStr = (probe.headers.get('Content-Range') || '').split('/')[1]
            const total = totalStr ? parseInt(totalStr, 10) : NaN
            if (probe.body) await probe.body.cancel().catch(() => {})
            if (entry.size > 0 && total === entry.size) return swUrl
            break
          }
        } catch {}
        if (attempt === 0) await new Promise((r) => setTimeout(r, 150))
      }
    }
  } catch {
    return null
  }

  if (isIosWebKit()) return null

  return getMediaBlobUrl(id, type)
}

// ── Core API ──────────────────────────────────────────────────────────────────

export async function resolveSrc(id: string, cdnUrl: string, type: 'audio' | 'video'): Promise<string> {
  if (!isOpfsSupported()) return cdnUrl
  const cachedUrl = await getCachedMediaPlaybackUrl(id, type)
  return cachedUrl ?? cdnUrl
}

/**
 * 저장 항목 삭제. 비디오 저장은 짝 `-audio`를 오디오 모드와 공유할 수 있어 소유권을 따른다:
 * - `video`: `-video` 삭제 + 짝 오디오에서 'video' 소유 해제(오디오 모드도 저장했으면 파일은 남는다)
 * - `audio`: 'audio' 소유 해제(비디오 저장이 쓰고 있으면 파일은 남는다)
 * - type 생략 또는 `purge`(손상 파일): 소유와 무관하게 파일을 지운다. 짝 오디오가 사라진 비디오는
 *   재생할 수 없으므로 같이 지운다.
 */
export async function deleteMedia(id: string, type?: 'audio' | 'video', opts: { purge?: boolean } = {}): Promise<void> {
  if (!type || (opts.purge && type === 'audio')) {
    await removeMediaCacheKey(`${id}-audio`)
    await removeMediaCacheKey(`${id}-video`)
    return
  }
  if (type === 'video') {
    await removeMediaCacheKey(`${id}-video`)
    await releaseAudioOwner(id, 'video')
    return
  }
  await releaseAudioOwner(id, 'audio')
}

async function releaseAudioOwner(id: string, owner: MediaOwner): Promise<void> {
  const key = `${id}-audio`
  const entry = await idbGet<FileEntry>('files', key)
  if (!entry) return
  const owners = audioOwnersOf(entry)
  if (!owners.includes(owner)) return
  const rest = owners.filter((o) => o !== owner)
  if (rest.length === 0) await removeMediaCacheKey(key)
  else await idbPut('files', { ...entry, ownedBy: rest })
}

/** 저장 항목에 표시용 메타를 기록한다(완료된 항목만, 없으면 무시). */
export async function setMediaMeta(cacheKey: string, meta: SavedMediaMeta): Promise<void> {
  const entry = await idbGet<FileEntry>('files', cacheKey)
  if (!entry || entry.status !== 'complete') return
  await idbPut('files', { ...entry, meta })
}

/**
 * 현재 저장 모드에 맞게 다운로드 보존 정책을 강제한다. 다운로드 직후, 그리고 모드 변경
 * 시점(사용자 클릭)에 호출한다. excludeKey(현재 재생 중인 cacheKey)는 절대 삭제하지 않는다
 * — SW/blob 재생 중인 파일을 지우면 재생이 끊긴다.
 *
 * - thrift(절약): 2곡 저장. 현재 곡 + 최근 1곡만 남기고 삭제(더 넘어가면 가장 오래된 곡 제거).
 * - normal(보통): 500MB 한도, 초과 시 오래된 것부터 삭제.
 * - generous(넉넉): 1GB 한도.
 * - custom(계속): 무제한. 자동 삭제 없음(용량 제한 미적용).
 */
export async function enforceStoragePolicy(excludeKey?: string): Promise<void> {
  const { offlineStorageMode } = useSettingsStore.getState()

  // '계속'(custom) 모드: 용량 제한 없음 — 어떤 다운로드도 자동 삭제하지 않는다.
  // (사용자가 직접 '저장된 내용 모두 지우기'로만 삭제. 개별 삭제는 설정 → 저장된 컨텐츠 목록(SavedContentPage)에서.)
  if (offlineStorageMode === 'custom') return

  const all = await idbGetAll<FileEntry>('files')
  const byKey = new Map(all.filter((f) => f.status === 'complete').map((f) => [f.id, f]))
  // 삭제 단위: 오디오 저장 1건, 또는 비디오 저장 1건(= `-video` + 비디오만 쓰는 짝 `-audio`).
  // 키 단위로 지우면 짝 오디오만 사라져 비디오가 재생 불가가 된다. excludeKey는 같은 영상 id 전체를 보호한다.
  const excludeId = excludeKey ? idFromCacheKey(excludeKey) : null
  const units: { id: string; type: 'audio' | 'video'; size: number; lastPlayedAt: number }[] = []
  for (const f of byKey.values()) {
    const id = idFromCacheKey(f.id)
    if (id === excludeId) continue
    const type = mediaTypeFromCacheKey(f.id)
    if (type === 'video') {
      const companion = byKey.get(`${id}-audio`)
      const ownsCompanion = companion != null && isVideoOnlyCompanion(companion)
      units.push({
        id, type,
        size: f.size + (ownsCompanion ? companion.size : 0),
        lastPlayedAt: Math.max(f.lastPlayedAt, companion?.lastPlayedAt ?? 0),
      })
    } else if (audioOwnersOf(f).includes('audio')) {
      units.push({ id, type, size: f.size, lastPlayedAt: f.lastPlayedAt })
    }
  }
  units.sort((a, b) => a.lastPlayedAt - b.lastPlayedAt)

  if (offlineStorageMode === 'thrift') {
    // 절약 모드: 현재 곡(excludeKey) + 최근 1곡 = 총 2곡 보관, 나머지 제거.
    // units는 excludeKey 제외 + lastPlayedAt 오름차순(오래된 것 먼저)이므로
    // 가장 최근 1개만 남기고 앞쪽(오래된 것)을 제거한다.
    const toEvict = units.slice(0, Math.max(0, units.length - 1))
    for (const u of toEvict) await deleteMedia(u.id, u.type)
    return
  }

  const limitBytes =
    offlineStorageMode === 'generous'
      ? 1 * 1024 * 1024 * 1024
      : 500 * 1024 * 1024

  let totalUsed = units.reduce((sum, u) => sum + u.size, 0)
  for (const u of units) {
    if (totalUsed <= limitBytes) break
    await deleteMedia(u.id, u.type)
    totalUsed -= u.size
  }
}

// 진행 중인 다운로드 취소용 레지스트리 (cacheKey → AbortController)
const _activeDownloads = new Map<string, AbortController>()
// 진행 중인 비디오 저장(짝 오디오 → 영상 2단계) 흐름. 단계 사이에 취소돼도 다음 단계로 넘어가지 않게 한다.
const _videoFlows = new Map<string, AbortController>()

/** 진행 중인 다운로드 취소 (미니 플레이어 닫기 등). 없으면 no-op. 비디오는 짝 오디오 단계까지 취소한다. */
export function cancelDownload(id: string, type: 'audio' | 'video'): void {
  if (type === 'video') _videoFlows.get(id)?.abort()
  _activeDownloads.get(`${id}-${type}`)?.abort()
}

export async function downloadMedia(
  id: string,
  cdnUrl: string,
  opts: {
    onProgress?: (pct: number) => void
    type?: 'audio' | 'video'
    estimatedSize?: number
    mimeType?: string
    /** `-audio`를 저장하는 주체(기본 'audio'). 이미 저장돼 있으면 소유자만 추가한다. */
    owner?: MediaOwner
    track?: DashTrack
    signal?: AbortSignal
  } = {},
): Promise<void> {
  if (!isOfflineMediaSupported()) throw new Error('Offline media is not supported on this device')
  if (opts.signal?.aborted) throw new DOMException('Download aborted', 'AbortError')

  // 절약 모드도 2곡까지 저장한다(다운로드 후 enforceStoragePolicy가 현재+최근 1곡만 남김).
  const mediaType = opts.type ?? 'audio'
  const cacheKey = `${id}-${mediaType}`
  const owner: MediaOwner = opts.owner ?? 'audio'
  const ownership = mediaType === 'audio' ? { ownedBy: [owner] } : {}

  const existing = await idbGet<FileEntry>('files', cacheKey)
  if (existing?.status === 'complete') {
    if (!isLegacyAudioCache(existing, mediaType)) {
      // 비디오 저장이 받아 둔 짝 오디오를 오디오 모드가 "저장"하면 파일은 그대로 두고 소유자만 늘린다.
      if (mediaType === 'audio' && !audioOwnersOf(existing).includes(owner)) {
        // 재생은 이미 이 파일로 되고 있었으므로(소유자와 무관) MEDIA_DOWNLOADED는 쏘지 않는다.
        await idbPut('files', { ...existing, ownedBy: withOwner(audioOwnersOf(existing), owner) })
      }
      return
    }
    await removeMediaCacheKey(cacheKey)
  }

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

  const mimeType = opts.mimeType?.trim() || (mediaType === 'video' ? 'video/mp4' : 'audio/mp4')
  if (!canPlayDownloadedMime(mediaType, mimeType)) {
    throw new Error(`Downloaded media type is not playable on this device: ${mimeType}`)
  }
  const now = Date.now()

  await idbPut('files', {
    id: cacheKey,
    filename: cacheKey,
    mimeType,
    size: 0,
    downloadedAt: now,
    lastPlayedAt: now,
    status: 'downloading',
    formatVersion: CACHE_FORMAT_VERSION,
    ...ownership,
  } as FileEntry)

  // 취소 가능하도록 컨트롤러 등록 (cancelDownload로 중단)
  const abortController = new AbortController()
  _activeDownloads.set(cacheKey, abortController)
  opts.signal?.addEventListener('abort', () => abortController.abort(), { once: true })

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

    // 무결성 검증: 완전히 받았고 OPFS에 온전히 써진 경우에만 complete로 기록한다.
    // 강종/네트워크 truncation으로 잘린 스트림이 done=true로 끝나 손상 파일이
    // "저장됨"으로 처리되는 것을 막는다. (헤더가 가려지지 않은 경우 Content-Length로,
    // 가려진 경우엔 최소한 OPFS 실제 기록 크기와 수신 바이트 일치로 검증.)
    if (received === 0) {
      throw new Error('Incomplete download: received 0 bytes')
    }
    if (headerTotal > 0 && received !== headerTotal) {
      throw new Error(`Incomplete download: ${received}/${headerTotal} bytes`)
    }
    const writtenFile = await fileHandle.getFile()
    if (writtenFile.size !== received) {
      throw new Error(`Corrupt download: OPFS file ${writtenFile.size}B != received ${received}B`)
    }

    // 같은 파일명에 새 바이트를 썼다 — 이전 File 스냅샷을 버린다.
    _fileCache.delete(cacheKey)
    await idbPut('files', {
      id: cacheKey,
      filename: cacheKey,
      mimeType,
      size: received,
      downloadedAt: now,
      lastPlayedAt: now,
      status: 'complete',
      formatVersion: CACHE_FORMAT_VERSION,
      ...ownership,
      ...(opts.track ? { track: opts.track } : {}),
    } as FileEntry)

    opts.onProgress?.(1)
    notifyMediaDownloaded({ id, type: mediaType, cacheKey })

    await enforceStoragePolicy(cacheKey)
  } catch (err) {
    // 취소/에러 시 열린 writable 닫고 부분 파일·락 정리 (다음 시도가 깨끗하게 재시작)
    try { await writable?.abort() } catch {}
    await removeMediaCacheKey(cacheKey)
    throw err
  } finally {
    _activeDownloads.delete(cacheKey)
  }
}

function trackFromDownload(info: VideoDownloadTrackInfo, fallbackDuration: number | null): DashTrack {
  // 프록시 URL의 `dur=`가 실제 길이(소수)다. DB duration은 정수 반올림이라 매니페스트 길이로는 덜 정확하다.
  let duration: number | undefined
  try {
    const dur = parseFloat(new URL(info.url).searchParams.get('dur') ?? '')
    if (Number.isFinite(dur) && dur > 0) duration = dur
  } catch {}
  return {
    mimeType: info.mimeType,
    init: info.init,
    index: info.index,
    bitrate: info.bitrate,
    ...(info.width && info.height ? { width: info.width, height: info.height } : {}),
    duration: duration ?? fallbackDuration ?? undefined,
  }
}

/**
 * 저장 파일의 최상위 MP4 박스를 읽어 SegmentBase 범위를 구한다(ftyp/moov = init, sidx = index).
 * 오디오 모드가 받아 둔 파일이 이번 응답의 트랙과 크기가 달라 백엔드 범위를 그대로 쓸 수 없을 때만 쓴다.
 */
async function probeSegmentBase(file: File): Promise<{ init: string; index: string } | null> {
  const head = new DataView(await file.slice(0, 256 * 1024).arrayBuffer())
  let offset = 0
  let moovEnd = -1
  while (offset + 8 <= head.byteLength) {
    let size = head.getUint32(offset)
    const type = String.fromCharCode(head.getUint8(offset + 4), head.getUint8(offset + 5), head.getUint8(offset + 6), head.getUint8(offset + 7))
    if (size === 1 && offset + 16 <= head.byteLength) size = Number(head.getBigUint64(offset + 8))
    if (size < 8) return null
    if (type === 'moov') moovEnd = offset + size
    if (type === 'sidx') return moovEnd > 0 ? { init: `0-${moovEnd - 1}`, index: `${offset}-${offset + size - 1}` } : null
    offset += size
  }
  return null
}

/**
 * 비디오 모드 저장: 짝 오디오(audio-only) → 영상(video-only) 두 파일을 순서대로 받는다(합치지 않음).
 * 재생은 `buildLocalDashManifest`가 두 파일을 DASH로 묶는다.
 *
 * - 오디오 모드로 이미 저장한 `-audio`(audio/mp4)가 있으면 다시 받지 않고 'video' 소유자와 트랙 정보만 더한다.
 *   크기가 응답 트랙(clen)과 같으면 같은 파일이라 백엔드 범위를, 다르면 파일에서 직접 읽은 범위를 쓴다.
 * - 영상이 마지막이라 MEDIA_DOWNLOADED(type 'video')는 짝이 다 갖춰진 뒤에만 나간다.
 * - 실패/취소 시 `deleteMedia(id, 'video')`로 정리한다 — 오디오 모드가 소유한 오디오는 지우지 않는다.
 */
export async function downloadVideoWithAudio(
  id: string,
  info: VideoDownloadInfo,
  opts: { onProgress?: (pct: number) => void } = {},
): Promise<void> {
  if (!isOfflineMediaSupported()) throw new Error('Offline media is not supported on this device')
  if (await isMediaCached(id, 'video')) return
  _videoFlows.get(id)?.abort()
  const flow = new AbortController()
  _videoFlows.set(id, flow)
  const total = info.audio.clen + info.video.clen
  const progress = (bytesBefore: number, size: number) => (p: number) =>
    opts.onProgress?.(Math.min(0.999, (bytesBefore + p * size) / total))
  const checkAborted = () => {
    if (flow.signal.aborted) throw new DOMException('Download aborted', 'AbortError')
  }

  try {
    const audioKey = `${id}-audio`
    const existing = await idbGet<FileEntry>('files', audioKey)
    if (existing?.status === 'complete' && existing.mimeType.toLowerCase().startsWith('audio/mp4')) {
      let track = existing.track
      if (!track) {
        const base = trackFromDownload(info.audio, info.duration)
        let ranges: { init: string; index: string } | null = { init: base.init, index: base.index }
        if (existing.size !== info.audio.clen) {
          const file = await getMediaFile(audioKey)
          ranges = file ? await probeSegmentBase(file) : null
        }
        if (!ranges) throw new Error('Saved audio has no SegmentBase index')
        track = { ...base, ...ranges, mimeType: existing.mimeType }
      }
      await idbPut('files', { ...existing, track, ownedBy: withOwner(audioOwnersOf(existing), 'video') })
    } else {
      await downloadMedia(id, info.audio.url, {
        type: 'audio',
        owner: 'video',
        track: trackFromDownload(info.audio, info.duration),
        mimeType: info.audio.mimeType,
        estimatedSize: info.audio.clen,
        signal: flow.signal,
        onProgress: progress(0, info.audio.clen),
      })
      // 다른 탭/흐름이 같은 키를 받는 중이면 downloadMedia가 백오프로 그냥 돌아온다 → 완료 여부를 직접 확인.
      const saved = await idbGet<FileEntry>('files', audioKey)
      if (saved?.status !== 'complete' || !saved.track || !audioOwnersOf(saved).includes('video')) {
        throw new Error('Companion audio was not saved')
      }
    }
    checkAborted()

    await downloadMedia(id, info.video.url, {
      type: 'video',
      track: trackFromDownload(info.video, info.duration),
      mimeType: info.video.mimeType,
      estimatedSize: info.video.clen,
      signal: flow.signal,
      onProgress: progress(info.audio.clen, info.video.clen),
    })
    if (!(await isMediaCached(id, 'video'))) throw new Error('Video was not saved')
    opts.onProgress?.(1)
  } catch (err) {
    await deleteMedia(id, 'video').catch(() => {})
    throw err
  } finally {
    if (_videoFlows.get(id) === flow) _videoFlows.delete(id)
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
  const { offlineStorageMode } = useSettingsStore.getState()
  const entries = await idbGetAll<FileEntry>('files')
  const complete: FileEntry[] = []
  for (const entry of entries) {
    if (entry.status !== 'complete') continue
    const type = mediaTypeFromCacheKey(entry.id)
    if (isLegacyAudioCache(entry, type)) {
      await removeMediaCacheKey(entry.id)
      continue
    }
    complete.push(entry)
  }
  const used = complete.reduce((sum, f) => sum + f.size, 0)

  let limit: number | null
  if (offlineStorageMode === 'thrift') limit = 0
  else if (offlineStorageMode === 'normal') limit = null
  else if (offlineStorageMode === 'generous') limit = 1 * 1024 * 1024 * 1024
  else limit = null // custom('계속'): 무제한

  return { used, limit, count: complete.length, entries: complete }
}

// 부트스트랩 1회 정리가 중복 실행(StrictMode 더블마운트 등)되지 않도록 가드.
let _reconcilePromise: Promise<void> | null = null

/**
 * 앱 시작 시 1회 호출. 강종(force-quit)으로 남은 미완료 다운로드 잠금과 손상 파일을 정리한다.
 * 어떤 다운로드도 시작되기 전(부트스트랩)에 호출해야 진행 중 다운로드를 오판해 지우지 않는다.
 *
 * - status='downloading' 고아 엔트리: 다운로드 도중 프로세스가 죽어 남은 잠금 →
 *   부분 OPFS 파일과 함께 제거 (다음 재생/다운로드가 깨끗하게 다시 받도록).
 * - status='complete'이지만 OPFS 파일이 없거나 크기가 기록과 다른 엔트리: 손상 → 제거.
 * - `track` 없는 `-video` 엔트리: 예전 muxed 단일 파일 저장의 유물(지금 재생 경로는 로컬 DASH뿐) → 제거.
 * - 짝이 깨진 비디오 저장: 짝 오디오 없는 `-video`는 제거, `-video` 없는 비디오 전용 오디오는 소유 해제(=제거).
 */
export function reconcileMediaStore(): Promise<void> {
  if (_reconcilePromise) return _reconcilePromise
  _reconcilePromise = (async () => {
    if (!isOpfsSupported()) return
    let entries: FileEntry[]
    try {
      entries = await idbGetAll<FileEntry>('files')
    } catch {
      return
    }
    for (const entry of entries) {
      try {
        if (entry.id.endsWith('-video') && !entry.track) {
          // 로컬 DASH 재료(SegmentBase 범위)가 없는 옛 비디오 저장 파일은 재생할 방법이 없다.
          if (import.meta.env.DEV) console.warn('[mediaStore] reconcile evicting (legacy video without track):', entry.id)
          await removeMediaCacheKey(entry.id)
          continue
        }
        if (entry.status !== 'complete') {
          // 미완료(다운로드 중) 잠금 = 강종 잔재 → 부분 파일/엔트리 제거
          await removeMediaCacheKey(entry.id)
          continue
        }
        // 완료 엔트리: 실제 OPFS 파일 존재 + 크기 일치 확인 (truncation/손상 감지)
        const mediaDir = await getMediaDir(false)
        const fileHandle = await mediaDir.getFileHandle(entry.filename)
        const file = await fileHandle.getFile()
        if (entry.size > 0 && file.size !== entry.size) {
          if (import.meta.env.DEV) console.warn('[mediaStore] reconcile evicting (size mismatch):', entry.id, file.size, '!=', entry.size)
          await removeMediaCacheKey(entry.id)
        }
      } catch (e) {
        // 파일이 실제로 없을 때(NotFoundError)만 손상으로 간주해 제거한다.
        // 일시적 접근 오류(권한/락 등)로 멀쩡한 complete 엔트리를 지우면 새로고침 시
        // 재다운로드가 발생하므로, 그 외 에러는 엔트리를 보존한다.
        const name = (e as DOMException)?.name
        if (name === 'NotFoundError') {
          if (import.meta.env.DEV) console.warn('[mediaStore] reconcile evicting (file missing):', entry.id)
          await removeMediaCacheKey(entry.id)
        } else {
          if (import.meta.env.DEV) console.warn('[mediaStore] reconcile keeping entry despite error:', entry.id, name, (e as Error)?.message)
        }
      }
    }

    // 짝 정리: 위에서 한쪽만 지워졌거나(손상/누락) 이전 세션이 중간에 죽은 비디오 저장.
    try {
      // 비디오 먼저 정리해야 그 결과(지워진 `-video`)가 아래 오디오 소유 해제 판정에 반영된다.
      const remaining = new Map((await idbGetAll<FileEntry>('files')).map((f) => [f.id, f]))
      for (const entry of [...remaining.values()]) {
        if (mediaTypeFromCacheKey(entry.id) !== 'video') continue
        const companion = remaining.get(`${idFromCacheKey(entry.id)}-audio`)
        if (companion?.status !== 'complete' || !audioOwnersOf(companion).includes('video')) {
          if (import.meta.env.DEV) console.warn('[mediaStore] reconcile evicting (video without companion audio):', entry.id)
          await removeMediaCacheKey(entry.id)
          remaining.delete(entry.id)
        }
      }
      for (const entry of remaining.values()) {
        const id = idFromCacheKey(entry.id)
        if (mediaTypeFromCacheKey(entry.id) === 'audio' && audioOwnersOf(entry).includes('video') && !remaining.has(`${id}-video`)) {
          await releaseAudioOwner(id, 'video')
        }
      }
    } catch {}
  })()
  return _reconcilePromise
}

export async function clearAllMedia(): Promise<void> {
  _fileCache.clear()
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
