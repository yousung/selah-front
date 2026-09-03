/**
 * DASH(shaka-player) 재생 래퍼 — `<video>`(비디오 모드)와 `<audio>`(Safari 계열 오디오) 공용.
 *
 * YouTube가 muxed(영상+음성 합본) 제공을 끊어 백엔드 `/videos/:id/stream`은 오디오 폴백만
 * 돌려준다. 영상을 보려면 video-only + audio-only 트랙을 MSE로 합쳐야 하고, 그게 DASH다.
 * 백엔드 `/videos/:id/manifest`가 모든 `<BaseURL>`을 절대 URL로 치환한 MPD 전문을 준다.
 *
 * 오디오 모드에서도 쓴다: Invidious 오디오 스트림(itag 140)은 fragmented MP4라
 * Safari(AVFoundation)가 progressive `<audio src>`로 못 읽고 **파일을 끝까지 받아야**
 * 재생을 시작한다(실측 27.8초). MSE로 먹이면 shaka가 `sidx`로 필요한 레인지만 받아
 * 즉시 시작한다. 자세한 근거는 `.omc/findings-download-slow.md`.
 *
 * - shaka는 ~300KB라 **동적 import로 지연 로드**한다. DASH를 안 쓰는 기기는 내려받지 않는다.
 * - `shaka.Player`는 앱 전체에서 **하나만** 만들어 재사용한다(attach → load → unload → destroy).
 *   `<video>`↔`<audio>` 사이를 오갈 수 있으므로 엘리먼트가 바뀌면 먼저 detach한다.
 * - **shaka가 엘리먼트의 src를 소유한다.** 밖에서 `src`를 쓰면 MediaSource가 깨지므로
 *   Layout의 `<video>`에는 `src`를 넘기지 않고, `<audio>`도 `isDashAttached()`로 걸러야 한다.
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
  configure(config: { manifest?: { disableVideo?: boolean } }): void
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

/**
 * `shaka.util.Error.Severity` 실측값(shaka-player 5.2.8, `lib/util/error.js:178-194`).
 * shaka는 severity와 무관하게 같은 `error` 이벤트를 dispatch하므로(`lib/player.js:9084`)
 * 여기서 갈라주지 않으면 자동복구 중인 에러까지 사용자 배너로 올라간다.
 */
const SEVERITY_RECOVERABLE = 1
const SEVERITY_CRITICAL = 2

let shakaNs: ShakaNamespace | null = null
let shakaLoadPromise: Promise<ShakaNamespace> | null = null
let player: ShakaPlayer | null = null
let attachedEl: HTMLMediaElement | null = null
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

/**
 * shaka가 이 브라우저에서 MSE/ManagedMediaSource로 재생 가능한지.
 * DASH 진입 전에 반드시 확인한다 — iOS 17.1 미만 Safari처럼 MSE가 아예 없는 기기에서
 * 그냥 load()하면 실패해 **소리조차 안 난다**(오디오 폴백 경로로 떨어뜨려야 한다).
 */
export async function isDashSupported(): Promise<boolean> {
  // MSE 계열이 하나도 없으면 isBrowserSupported()도 어차피 false다.
  // 여기서 끊어 shaka(~300KB) 다운로드 자체를 막는다(미지원 기기는 대개 구형 단말).
  if (
    typeof window !== 'undefined' &&
    !('MediaSource' in window) &&
    !('ManagedMediaSource' in window)
  ) {
    return false
  }
  try {
    const ns = await loadShaka()
    return ns.Player.isBrowserSupported()
  } catch {
    return false
  }
}

/**
 * 싱글턴 Player를 준비해 주어진 미디어 엘리먼트에 붙인다. 이미 다른 엘리먼트에 붙어 있으면
 * (모드 전환으로 Layout이 `<video>`를 새로 마운트했거나, 오디오 DASH ↔ 비디오 DASH 전환)
 * 먼저 떼어낸 뒤 재부착한다.
 * `onError`는 shaka error 이벤트를 받는다(load 중단/취소 코드는 걸러낸 뒤 호출).
 */
export async function ensureDashPlayer(
  el: HTMLMediaElement,
  onError: (code: number | null) => void,
): Promise<void> {
  const ns = await loadShaka()
  errorHandler = onError
  if (player && attachedEl === el) return
  if (!player) {
    player = new ns.Player()
    player.addEventListener('error', (event) => {
      const detail = (event as { detail?: { code?: number; severity?: number } }).detail
      const code = detail?.code ?? null
      if (code === LOAD_INTERRUPTED || code === OPERATION_ABORTED) return
      // 세그먼트 fetch가 실패해도 **대체 스트림으로 갈아탈 수 있으면** shaka는 그 스트림을
      // disableStream()으로 끄고 severity를 RECOVERABLE로 낮춘 뒤 재생을 이어간다
      // (`lib/media/streaming_engine.js:3316-3327`). 그래도 error 이벤트는 그대로 나가므로
      // 여기서 안 거르면 화질만 조용히 강등되면 될 상황에 "재생 오류" 배너가 뜬다.
      // 실측(720p 세그먼트만 500): 배너 없이 1280x720 → 640x360으로 강등되고 재생 지속.
      // severity를 못 읽는 경우(undefined)는 조용히 삼키지 말고 CRITICAL로 취급한다 —
      // 회색 화면만 남는 회귀가 배너 오탐보다 나쁘다.
      if (detail?.severity != null && detail.severity !== SEVERITY_CRITICAL) {
        if (import.meta.env.DEV) {
          console.warn(
            `[dash] recoverable error (severity=${detail.severity}${
              detail.severity === SEVERITY_RECOVERABLE ? '/RECOVERABLE' : ''
            }, code=${code}) — shaka 자동 재시도, 배너 미표시`,
            detail,
          )
        }
        return
      }
      errorHandler?.(code)
    })
  }
  // 다른 엘리먼트에 붙어 있으면 명시적으로 뗀다. detach()가 이전 엘리먼트의 MediaSource와
  // `<source>` 자식을 정리하고 disableRemotePlayback도 원복하므로(shaka
  // `media_source_engine.js`), 그 엘리먼트에 다시 `src`를 쓰는 progressive 경로가 살아난다.
  if (attachedEl && attachedEl !== el) {
    try {
      await player.detach()
    } catch {
      /* 이미 떨어진 상태 — 무시 */
    }
    attachedEl = null
  }
  await player.attach(el)
  attachedEl = el
  // 오디오 전용 제한. shaka는 `<audio>`에 붙으면 스스로 `manifest.disableVideo`를 켜지만
  // (`lib/player.js` applyConfig_: "Don't read video segments if the player is attached to an
  // audio element"), 싱글턴이 `<video>`에서 옮겨온 경우까지 확실히 하려고 명시한다.
  // 이게 켜지면 DASH 파서가 video AdaptationSet을 아예 무시해 **비디오 바이트를 0 받는다.**
  //
  // `restrictions.maxHeight = 0`을 쓰면 안 된다: 이 매니페스트는 audio 1 + video 3 구성이라
  // shaka DASH 파서가 audio×video 조합 variant만 만든다(audio-only variant 없음). 그 상태에서
  // 모든 variant를 제한하면 RESTRICTIONS_CANNOT_BE_MET(4012)로 재생이 죽는다.
  player.configure({ manifest: { disableVideo: el.nodeName === 'AUDIO' } })
}

/**
 * shaka가 이 엘리먼트를 소유(attach)하고 있는가.
 * 소유 중이면 엘리먼트의 `src`를 밖에서 건드리면 안 된다(shaka가 MediaSource를 물고 있다).
 * `unload()`는 src를 비우지만 attach는 유지하므로 src 유무로는 판별할 수 없다.
 */
export function isDashAttached(el: HTMLMediaElement | null | undefined): boolean {
  return player != null && el != null && attachedEl === el
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
