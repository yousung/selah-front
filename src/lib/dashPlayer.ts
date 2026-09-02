/**
 * DASH(shaka-player) 재생 래퍼 — 비디오 모드 전용.
 *
 * YouTube가 muxed(영상+음성 합본) 제공을 끊어 백엔드 `/videos/:id/stream`은 오디오 폴백만
 * 돌려준다. 영상을 보려면 video-only + audio-only 트랙을 MSE로 합쳐야 하고, 그게 DASH다.
 * 백엔드 `/videos/:id/manifest`가 모든 `<BaseURL>`을 절대 URL로 치환한 MPD 전문을 준다.
 *
 * - shaka는 ~300KB라 **동적 import로 지연 로드**한다. 오디오 전용 사용자는 내려받지 않는다.
 * - `shaka.Player`는 앱 전체에서 **하나만** 만들어 재사용한다(attach → load → unload → destroy).
 * - **shaka가 `<video>`의 src를 소유한다.** React가 `src`를 같이 세팅하면 충돌하므로
 *   Layout의 `<video>`에는 `src`를 넘기지 않는다.
 * - `reactPlayerRef`에 의존하지 않는다: 모드 전환 시 React가 ref를 먼저 null로 만들기 때문에
 *   이 모듈이 attach한 엘리먼트를 자체 보관해 정리(detach/destroy)한다.
 */

// clutz가 생성한 shaka 타입 선언(dist/shaka-player.compiled.d.ts)은 클래스 본문이 비어 있어
// (메서드가 노출되지 않음) 그대로는 쓸 수 없다. 실제로 쓰는 API만 최소 인터페이스로 선언한다.
interface ShakaPlayer {
  attach(el: HTMLMediaElement): Promise<void>
  detach(): Promise<void>
  load(uri: string, startTime?: number | null, mimeType?: string): Promise<void>
  unload(): Promise<void>
  destroy(): Promise<void>
  addEventListener(type: string, listener: (event: Event) => void): void
}

interface ShakaNamespace {
  Player: { new (): ShakaPlayer; isBrowserSupported(): boolean }
  polyfill: { installAll(): void }
}

/** 새 load()가 이전 load()를 대체할 때 나는 코드 — 에러 UX로 올리면 안 된다. */
const LOAD_INTERRUPTED = 7000
/** unload/destroy로 진행 중 동작이 취소될 때 나는 코드 — 위와 동일하게 정상 흐름이다. */
const OPERATION_ABORTED = 7001

let shakaNs: ShakaNamespace | null = null
let shakaLoadPromise: Promise<ShakaNamespace> | null = null
let player: ShakaPlayer | null = null
let attachedEl: HTMLVideoElement | null = null
let errorHandler: ((code: number | null) => void) | null = null
// 현재 load에 쓰인 MPD blob URL. 다음 load/unload/destroy 때 해제한다(로드 직후 해제하면
// shaka가 재시도로 매니페스트를 다시 요청할 때 URL이 이미 죽어 있을 수 있다).
let manifestBlobUrl: string | null = null

function revokeManifestBlob() {
  if (!manifestBlobUrl) return
  URL.revokeObjectURL(manifestBlobUrl)
  manifestBlobUrl = null
}

async function loadShaka(): Promise<ShakaNamespace> {
  if (shakaNs) return shakaNs
  if (!shakaLoadPromise) {
    shakaLoadPromise = import('shaka-player')
      .then((mod) => {
        const ns = ((mod as unknown as { default?: ShakaNamespace }).default ??
          (mod as unknown as ShakaNamespace))
        // ManagedMediaSource(iOS 17.1+) 등 브라우저별 폴리필. 최초 1회만.
        ns.polyfill.installAll()
        shakaNs = ns
        return ns
      })
      .catch((e) => {
        shakaLoadPromise = null
        throw e
      })
  }
  return shakaLoadPromise
}

/** shaka가 이 브라우저에서 MSE/ManagedMediaSource로 재생 가능한지. */
export async function isDashSupported(): Promise<boolean> {
  try {
    const ns = await loadShaka()
    return ns.Player.isBrowserSupported()
  } catch {
    return false
  }
}

/**
 * 싱글턴 Player를 준비해 주어진 `<video>`에 붙인다. 이미 다른 엘리먼트에 붙어 있으면
 * (모드 전환으로 Layout이 `<video>`를 새로 마운트한 경우) 재부착한다.
 * `onError`는 shaka error 이벤트를 받는다(load 중단/취소 코드는 걸러낸 뒤 호출).
 */
export async function ensureDashPlayer(
  el: HTMLVideoElement,
  onError: (code: number | null) => void,
): Promise<void> {
  const ns = await loadShaka()
  errorHandler = onError
  if (player && attachedEl === el) return
  if (!player) {
    player = new ns.Player()
    player.addEventListener('error', (event) => {
      const code = (event as { detail?: { code?: number } }).detail?.code ?? null
      if (code === LOAD_INTERRUPTED || code === OPERATION_ABORTED) return
      errorHandler?.(code)
    })
  }
  await player.attach(el)
  attachedEl = el
}

/**
 * MPD 전문을 blob URL로 만들어 로드한다. `<BaseURL>`이 절대 URL이라 blob 기준 상대경로
 * 해석 문제가 없다. `startTime`을 넘기면 그 위치에서 시작한다(seeked-after-load 패턴 불필요).
 */
export async function loadDash(
  manifest: string,
  mimeType: string,
  startTime?: number | null,
): Promise<void> {
  const p = player
  if (!p) throw new Error('dash player is not attached')
  revokeManifestBlob()
  const blobUrl = URL.createObjectURL(new Blob([manifest], { type: mimeType }))
  manifestBlobUrl = blobUrl
  await p.load(blobUrl, startTime ?? null, mimeType)
}

/** 트랙 전환/정지: 재생을 내리되 Player 인스턴스와 attach는 유지한다. */
export async function unloadDash(): Promise<void> {
  const p = player
  revokeManifestBlob()
  if (!p) return
  try {
    await p.unload()
  } catch {
    /* 이미 내려간 상태 — 무시 */
  }
}

/** 모드 전환/언마운트: Player를 완전히 파괴한다(detach 포함). */
export async function destroyDash(): Promise<void> {
  const p = player
  player = null
  attachedEl = null
  errorHandler = null
  revokeManifestBlob()
  if (!p) return
  try {
    await p.destroy()
  } catch {
    /* 무시 */
  }
}

/** load()가 새 load/unload에 의해 취소된 것인지(=사용자에게 보일 에러가 아님). */
export function isDashAbortError(err: unknown): boolean {
  const code = (err as { code?: number } | null)?.code
  return code === LOAD_INTERRUPTED || code === OPERATION_ABORTED
}
