import { create } from 'zustand'
import {
  isPwa,
  isIosWebKit,
  isOpfsSupported,
  peekMediaEntry,
  getServiceWorkerMediaUrl,
  ensureServiceWorkerControl,
} from '@/lib/mediaStore'

// ── 마지막 "실제 재생" 진단 스토어 ─────────────────────────────────────────────
// fresh probe만으론 부족 — 실제 재생이 어떤 src로 갔고, 무엇이 터졌는지 기록한다.
// 오버레이가 이 값을 구독해 보여줄 수 있도록 zustand로 둔다(기존 스토어 패턴과 동일).

export type PlaybackSource = 'sw' | 'blob' | 'stream'

export interface LastPlayback {
  id: string | null
  type: 'audio' | 'video' | null
  source: PlaybackSource | null
  src: string | null
  // 마지막 재생 error 핸들러에서 채움
  errorCode: number | null
  networkState: number | null
  readyState: number | null
  errorSrc: string | null
  // iOS 안전 픽스: 이 세션에 파일을 보존했는지(삭제 안 함) 여부
  preservedFile: boolean
  at: number
}

interface LastPlaybackState extends LastPlayback {
  setPlayback: (p: { id: string; type: 'audio' | 'video'; source: PlaybackSource; src: string }) => void
  setError: (e: { code: number | null; networkState: number | null; readyState: number | null; src: string | null; preservedFile: boolean }) => void
}

export const useLastPlaybackStore = create<LastPlaybackState>((set) => ({
  id: null,
  type: null,
  source: null,
  src: null,
  errorCode: null,
  networkState: null,
  readyState: null,
  errorSrc: null,
  preservedFile: false,
  at: 0,
  setPlayback: (p) =>
    set({
      id: p.id,
      type: p.type,
      source: p.source,
      src: p.src,
      errorCode: null,
      networkState: null,
      readyState: null,
      errorSrc: null,
      preservedFile: false,
      at: Date.now(),
    }),
  setError: (e) =>
    set({
      errorCode: e.code,
      networkState: e.networkState,
      readyState: e.readyState,
      errorSrc: e.src,
      preservedFile: e.preservedFile,
      at: Date.now(),
    }),
}))

/** 비-React 코드(AudioContext)에서 호출하는 경량 setter. */
export function setLastPlayback(p: { id: string; type: 'audio' | 'video'; source: PlaybackSource; src: string }): void {
  useLastPlaybackStore.getState().setPlayback(p)
}

export function setLastPlaybackError(e: {
  code: number | null
  networkState: number | null
  readyState: number | null
  src: string | null
  preservedFile: boolean
}): void {
  useLastPlaybackStore.getState().setError(e)
}

export function getLastPlayback(): LastPlayback {
  return useLastPlaybackStore.getState()
}

// ── 진단 리포트 ────────────────────────────────────────────────────────────────

export interface SwDebugView {
  swReached: boolean | null
  opfsSupported: boolean | null
  entryFound: boolean | null
  entryStatus: string | null
  filename: string | null
  fileFound: boolean | null
  fileSize: number | null
  error: string | null
  httpStatus: number | null
  fetchError: string | null
}

export interface MediaDiagReport {
  id: string
  type: 'audio' | 'video'
  at: number
  // env
  isPwa: boolean
  isIos: boolean
  userAgent: string
  hasController: boolean
  swScope: string | null
  swActiveState: string | null
  // capability
  opfsSupported: boolean
  createWritableInProto: boolean
  opfsWriteTestOk: boolean
  opfsWriteTestError: string | null
  // window-side cache view
  cachedView: boolean
  entryFound: boolean
  entryStatus: string | null
  entryFilename: string | null
  entrySize: number | null
  // probe (window → SW /media)
  probeStatus: number | null
  probeContentRange: string | null
  probeError: string | null
  // SW self-diagnostic view (/media-debug)
  sw: SwDebugView
}

/** OPFS createWritable 마이크로 테스트 (RC1 교차검증). 'media' 디렉터리는 절대 건드리지 않는다. */
async function runOpfsWriteTest(): Promise<{ ok: boolean; error: string | null }> {
  if (!isOpfsSupported()) return { ok: false, error: 'OPFS not supported' }
  if (typeof FileSystemFileHandle === 'undefined' || !('createWritable' in FileSystemFileHandle.prototype)) {
    return { ok: false, error: 'createWritable not on prototype' }
  }
  const fileName = `diag-${Date.now()}.bin`
  let diagDir: FileSystemDirectoryHandle | null = null
  try {
    const root = await navigator.storage.getDirectory()
    diagDir = await root.getDirectoryHandle('diag', { create: true })
    const handle = await diagDir.getFileHandle(fileName, { create: true })
    const writable = await handle.createWritable()
    await writable.write(new Uint8Array([0x53]))
    await writable.close()
    const file = await handle.getFile()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const ok = bytes.length === 1 && bytes[0] === 0x53
    return { ok, error: ok ? null : 'readback mismatch' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    try { await diagDir?.removeEntry(fileName) } catch {}
  }
}

function getSwDebugBaseUrl(idType: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}media-debug/${encodeURIComponent(idType)}`
}

export async function runMediaDiag(id: string, type: 'audio' | 'video'): Promise<MediaDiagReport> {
  const report: MediaDiagReport = {
    id,
    type,
    at: Date.now(),
    isPwa: false,
    isIos: false,
    userAgent: '',
    hasController: false,
    swScope: null,
    swActiveState: null,
    opfsSupported: false,
    createWritableInProto: false,
    opfsWriteTestOk: false,
    opfsWriteTestError: null,
    cachedView: false,
    entryFound: false,
    entryStatus: null,
    entryFilename: null,
    entrySize: null,
    probeStatus: null,
    probeContentRange: null,
    probeError: null,
    sw: {
      swReached: null,
      opfsSupported: null,
      entryFound: null,
      entryStatus: null,
      filename: null,
      fileFound: null,
      fileSize: null,
      error: null,
      httpStatus: null,
      fetchError: null,
    },
  }

  // env
  try { report.isPwa = isPwa() } catch {}
  try { report.isIos = isIosWebKit() } catch {}
  try { report.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '' } catch {}
  // hasController set after ensureServiceWorkerControl wait below (post-wait value)
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      report.swScope = reg?.scope ?? null
      report.swActiveState = reg?.active?.state ?? null
    }
  } catch {}

  // capability
  try { report.opfsSupported = isOpfsSupported() } catch {}
  try {
    report.createWritableInProto =
      typeof FileSystemFileHandle !== 'undefined' && 'createWritable' in FileSystemFileHandle.prototype
  } catch {}
  try {
    const w = await runOpfsWriteTest()
    report.opfsWriteTestOk = w.ok
    report.opfsWriteTestError = w.error
  } catch (err) {
    report.opfsWriteTestError = err instanceof Error ? err.message : String(err)
  }

  // window-side cache view — peekMediaEntry first (side-effect-free, no getUsableCompleteEntry)
  try {
    const peek = await peekMediaEntry(id, type)
    report.entryFound = peek.found
    report.entryStatus = peek.status
    report.entryFilename = peek.filename
    report.entrySize = peek.size
    // derive cachedView from peek to avoid isMediaCached → getUsableCompleteEntry side-effect
    report.cachedView = peek.found && peek.status === 'complete'
  } catch {}

  // probe: wait for SW control (mirrors getCachedMediaPlaybackUrl → ensureServiceWorkerControl)
  // then probe twice like the real path, record post-wait hasController
  try {
    const controlled = await ensureServiceWorkerControl(3000)
    report.hasController = controlled || !!navigator.serviceWorker?.controller
    const swUrl = getServiceWorkerMediaUrl(id, type)
    let probeOk = false
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const probe = await fetch(swUrl, { headers: { Range: 'bytes=0-0' } })
        report.probeStatus = probe.status
        report.probeContentRange = probe.headers.get('Content-Range')
        if (probe.body) await probe.body.cancel().catch(() => {})
        if (probe.status === 206) { probeOk = true; break }
      } catch (err) {
        report.probeError = err instanceof Error ? err.message : String(err)
      }
    }
    if (!probeOk && report.probeStatus === null) {
      report.probeError = report.probeError ?? 'both probe attempts failed'
    }
  } catch (err) {
    report.probeError = err instanceof Error ? err.message : String(err)
  }

  // SW self-diagnostic view: /media-debug → JSON
  try {
    const res = await fetch(getSwDebugBaseUrl(`${id}-${type}`))
    report.sw.httpStatus = res.status
    const json = (await res.json()) as Partial<SwDebugView>
    report.sw.swReached = json.swReached ?? null
    report.sw.opfsSupported = json.opfsSupported ?? null
    report.sw.entryFound = json.entryFound ?? null
    report.sw.entryStatus = json.entryStatus ?? null
    report.sw.filename = json.filename ?? null
    report.sw.fileFound = json.fileFound ?? null
    report.sw.fileSize = json.fileSize ?? null
    report.sw.error = json.error ?? null
  } catch (err) {
    report.sw.fetchError = err instanceof Error ? err.message : String(err)
  }

  return report
}

// ── 사람이 읽고 복붙 가능한 멀티라인 문자열 ──────────────────────────────────────

export function toText(report: MediaDiagReport): string {
  const last = getLastPlayback()
  const lines: string[] = []
  const ts = new Date(report.at).toISOString()
  lines.push(`=== Selah Media Diag (${ts}) ===`)
  lines.push(`id=${report.id} type=${report.type}`)
  lines.push('-- env --')
  lines.push(`isPwa=${report.isPwa} isIos=${report.isIos}`)
  lines.push(`hasController=${report.hasController}`)
  lines.push(`swScope=${report.swScope ?? '-'} swActiveState=${report.swActiveState ?? '-'}`)
  lines.push(`ua=${report.userAgent}`)
  lines.push('-- capability --')
  lines.push(`opfsSupported=${report.opfsSupported} createWritableInProto=${report.createWritableInProto}`)
  lines.push(`opfsWriteTestOk=${report.opfsWriteTestOk} err=${report.opfsWriteTestError ?? '-'}`)
  lines.push('-- window cache view --')
  lines.push(`cachedView=${report.cachedView} entryFound=${report.entryFound} status=${report.entryStatus ?? '-'}`)
  lines.push(`filename=${report.entryFilename ?? '-'} size=${report.entrySize ?? '-'}`)
  lines.push('-- probe (window→SW /media Range 0-0) --')
  lines.push(`status=${report.probeStatus ?? '-'} contentRange=${report.probeContentRange ?? '-'} err=${report.probeError ?? '-'}`)
  lines.push('-- sw view (/media-debug) --')
  lines.push(`httpStatus=${report.sw.httpStatus ?? '-'} fetchError=${report.sw.fetchError ?? '-'}`)
  lines.push(`swReached=${report.sw.swReached ?? '-'} opfsSupported=${report.sw.opfsSupported ?? '-'}`)
  lines.push(`entryFound=${report.sw.entryFound ?? '-'} entryStatus=${report.sw.entryStatus ?? '-'}`)
  lines.push(`filename=${report.sw.filename ?? '-'} fileFound=${report.sw.fileFound ?? '-'} fileSize=${report.sw.fileSize ?? '-'}`)
  lines.push(`error=${report.sw.error ?? '-'}`)
  lines.push('-- last actual playback --')
  lines.push(`id=${last.id ?? '-'} type=${last.type ?? '-'} source=${last.source ?? '-'}`)
  lines.push(`src=${last.src ?? '-'}`)
  lines.push(`errorCode=${last.errorCode ?? '-'} networkState=${last.networkState ?? '-'} readyState=${last.readyState ?? '-'}`)
  lines.push(`errorSrc=${last.errorSrc ?? '-'} preservedFile=${last.preservedFile}`)
  return lines.join('\n')
}
