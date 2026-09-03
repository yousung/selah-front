import { create } from 'zustand'
import { didAttemptShakaChunkReload, type DashSupport } from '@/lib/dashPlayer'
import { isIOS, iosVersion } from '@/lib/platform'
import {
  isPwa,
  isIosWebKit,
  isOpfsSupported,
  peekMediaEntry,
  getServiceWorkerMediaUrl,
  ensureServiceWorkerControl,
  fetchWithTimeout,
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

/**
 * 재생 시작을 위한 **첫 `play()` 시도**의 결과. iOS 실기기에서 "첫 탭은 재생이 안 되고
 * 두 번째 탭부터 된다"는 보고가 추측이 아니라 데이터가 되게 하려고 남긴다.
 *
 * 읽는 법:
 * - `ok=false, errorName='NotAllowedError'` → 자동재생/제스처 정책에 막힘.
 *   `userActivation`이 같이 false면 제스처 창이 만료된 것이고, true인데도 막혔다면
 *   엘리먼트별 제약(= `primed`가 false였는지 확인)이다.
 * - `ok=true`인데 소리가 안 난다 → play()는 통과했다는 뜻이라 정책 문제가 아니다.
 *   `readyState`/`networkState`로 버퍼링·네트워크 쪽을 봐야 한다.
 */
export interface PlayAttempt {
  /** 어느 경로의 play()인가: 저장파일 / 오디오 스트림 / DASH(shaka) */
  phase: 'cache' | 'stream' | 'dash'
  /**
   * `true`=재생 시작, `false`=거절, **`null`=promise가 아직 안 끝남(pending)**.
   * pending이 그대로 남아 있으면 정책 차단이 아니라 **미디어가 시작을 못 한 것**이다
   * (`play()`의 promise는 실제 재생이 시작돼야 resolve된다 — 버퍼링에 걸리면 영원히 pending).
   * 이 셋을 구분 못 하면 "첫 탭에 소리가 안 난다"의 원인을 좁힐 수 없다.
   */
  ok: boolean | null
  /** 거절 사유(`NotAllowedError`, `AbortError`, `NotSupportedError` …). 성공 시 null. */
  errorName: string | null
  readyState: number | null
  networkState: number | null
  /** `HTMLMediaElement.error.code` (1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED) */
  mediaErrorCode: number | null
  /** play() 호출 시점의 `navigator.userActivation.isActive`. 미지원 브라우저는 null. */
  userActivation: boolean | null
  /** 이 재생 요청에서 iOS 제스처 언락 프라이머(mediaUnlock)를 돌렸는가. */
  primed: boolean
  /** display-mode: standalone (설치형 PWA) */
  isPwa: boolean
  /** iOS 전용 홈화면 추가 여부(`navigator.standalone`). 비-iOS는 null. */
  iosStandalone: boolean | null
  /** 예: '18.7'. UA에서 못 읽으면 null. */
  iosVersion: string | null
  at: number
}

interface LastPlaybackState extends LastPlayback {
  play: PlayAttempt | null
  /**
   * 가장 최근 `checkDashSupport()` 결과. `'load-failed'`가 보이면 **기기 문제가 아니라
   * shaka 청크를 못 받은 것**이다 — 앱을 열어둔 채로 배포가 나가면 그 페이지의 index.html이
   * 가리키는 옛 해시 청크가 서버에서 사라져 404가 난다. 이 값이 없으면 "Safari인데 27.8초
   * 걸린다"는 신고에서 게이트 미적용인지 청크 404인지 구분할 수 없다.
   */
  dashSupport: DashSupport | null
  /** 이 세션에서 shaka 청크 로드가 실패한 횟수(재생 시도마다 1). */
  dashLoadFailures: number
  setPlayback: (p: { id: string; type: 'audio' | 'video'; source: PlaybackSource; src: string }) => void
  setError: (e: { code: number | null; networkState: number | null; readyState: number | null; src: string | null; preservedFile: boolean }) => void
  setPlayAttempt: (a: PlayAttempt) => void
  setDashSupport: (s: DashSupport) => void
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
  play: null,
  dashSupport: null,
  dashLoadFailures: 0,
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
      // 새 재생 요청 → 이전 곡의 play() 결과는 스테일이다. 지우지 않으면 다음 진단 리포트가
      // 엉뚱한 곡의 실패를 이번 곡의 원인으로 보고하게 된다.
      play: null,
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
  setPlayAttempt: (a) => set({ play: a }),
  setDashSupport: (v) =>
    set((st) => ({
      dashSupport: v,
      dashLoadFailures: st.dashLoadFailures + (v === 'load-failed' ? 1 : 0),
    })),
}))

/** 비-React 코드(AudioContext)에서 호출하는 경량 setter. */
export function setLastPlayback(p: { id: string; type: 'audio' | 'video'; source: PlaybackSource; src: string }): void {
  useLastPlaybackStore.getState().setPlayback(p)
}

/**
 * DASH 가용성 판정 결과를 남긴다. `'load-failed'`는 진단에서 제일 중요한 값이다 —
 * 기기 미지원(`'unsupported'`)과 달리 **일시적이고 배포와 함께 발생**하므로,
 * 같은 신고가 또 오면 이 값 하나로 원인이 갈린다.
 */
export function setLastDashSupport(v: DashSupport): void {
  useLastPlaybackStore.getState().setDashSupport(v)
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

/**
 * `play()` 시도를 기록한다. **호출 직전에 `pending: true`로 한 번, settle된 뒤 결과로 또 한 번**
 * 부른다. pending 기록이 없으면 promise가 영영 안 끝나는 경우(버퍼링에 걸려 재생이 시작조차
 * 못 함)가 "시도 없음"과 구분되지 않아, 정작 제일 흔한 실패 모드를 놓친다.
 * 성공도 남긴다 — "play()는 통과했는데 소리가 안 난다"면 정책 문제가 아니라는 증거가 된다.
 * 엘리먼트 상태는 호출 시점에 즉시 읽는다(나중에 읽으면 이미 변해 있다).
 */
export function setLastPlayAttempt(a: {
  phase: PlayAttempt['phase']
  el: HTMLMediaElement | null
  error: unknown
  primed: boolean
  /** play() 호출 직전 기록(결과 미확정). */
  pending?: boolean
}): void {
  const err = a.error as { name?: string } | null
  useLastPlaybackStore.getState().setPlayAttempt({
    phase: a.phase,
    ok: a.pending ? null : a.error == null,
    errorName: a.pending || a.error == null ? null : err?.name ?? String(a.error),
    readyState: a.el?.readyState ?? null,
    networkState: a.el?.networkState ?? null,
    mediaErrorCode: a.el?.error?.code ?? null,
    userActivation: navigator.userActivation ? navigator.userActivation.isActive : null,
    primed: a.primed,
    isPwa: isPwa(),
    // navigator.standalone은 iOS 전용 비표준 속성이라 타입에 없다.
    iosStandalone: isIOS() ? (navigator as { standalone?: boolean }).standalone ?? null : null,
    iosVersion: iosVersion(),
    at: Date.now(),
  })
}

export function getLastPlayback(): LastPlayback & {
  play: PlayAttempt | null
  dashSupport: DashSupport | null
  dashLoadFailures: number
} {
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
    // 타임아웃 레이스: OPFS write가 hang해도 diag 전체가 멈추지 않게.
    const w = await Promise.race([
      runOpfsWriteTest(),
      new Promise<{ ok: boolean; error: string | null }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: 'timeout(3s)' }), 3000),
      ),
    ])
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
        const probe = await fetchWithTimeout(swUrl, { headers: { Range: 'bytes=0-0' } })
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
    const res = await fetchWithTimeout(getSwDebugBaseUrl(`${id}-${type}`))
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
  lines.push(
    `dashSupport=${last.dashSupport ?? '-'} dashLoadFailures=${last.dashLoadFailures}` +
      ` shakaChunkReloadTried=${didAttemptShakaChunkReload()}`,
  )
  if (last.dashSupport === 'load-failed') {
    lines.push('  ⚠️ shaka 청크를 못 받았다(기기 문제 아님). 앱을 열어둔 채 배포가 나가면')
    lines.push('     옛 해시 청크가 서버에서 사라져 404가 난다. 리로드해야 복구된다.')
    lines.push('     shakaChunkReloadTried=true인데도 load-failed면 자동 리로드 1회가 이미')
    lines.push('     돌았고 그래도 실패한 것이다 = 청크가 정말로 없다(무한 리로드는 막혀 있다).')
  }
  lines.push('-- first play() attempt --')
  const p = last.play
  if (!p) {
    lines.push('(없음 — 이 곡에서 play()가 아직 시도되지 않음)')
  } else {
    lines.push(`phase=${p.phase} ok=${p.ok === null ? 'pending(promise 미완료)' : p.ok} errorName=${p.errorName ?? '-'}`)
    lines.push(`readyState=${p.readyState ?? '-'} networkState=${p.networkState ?? '-'} mediaErrorCode=${p.mediaErrorCode ?? '-'}`)
    lines.push(`userActivation=${p.userActivation ?? '-'} primed=${p.primed}`)
    lines.push(`isPwa=${p.isPwa} iosStandalone=${p.iosStandalone ?? '-'} iosVersion=${p.iosVersion ?? '-'}`)
  }
  return lines.join('\n')
}
