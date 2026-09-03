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
// 진행 중인 destroyDash()의 Promise. teardown이 비동기이고 그 사이 엘리먼트를 건드리므로
// "정리 중"도 attach와 똑같이 위험한 구간이다 — isDashAttached()가 이걸 같이 본다.
let teardownPromise: Promise<void> | null = null

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
 * DASH 가용성 판정 결과. **`unsupported`와 `load-failed`를 반드시 구분해야 한다.**
 *
 * - `unsupported` — 기기/브라우저가 MSE를 못 한다(iOS 17.1 미만 Safari 등). 세션 내내
 *   안 바뀌는 성질이므로 호출부가 래치해도 된다.
 * - `load-failed` — shaka 청크 동적 import가 실패했다. **일시적이다.** 현실적 트리거는
 *   기기 능력이 아니라 **배포 직후 stale index.html이 옛 chunk 해시를 가리켜 404**나는
 *   경우다. 이걸 래치하면 그 세션 동안 Safari 오디오가 27.8초 progressive로 되돌아가고
 *   비디오 모드는 영구 오디오 전용이 된다. `loadShaka()`가 실패 시 `shakaLoadPromise`를
 *   null로 되돌려 재시도를 가능하게 해 두었으므로, **호출부는 래치하지 말고 다음 재생에서
 *   다시 물어야 한다.**
 */
export type DashSupport = 'supported' | 'unsupported' | 'load-failed'

/** 청크 로드 실패로 리로드를 이미 시도한 브라우징 세션인지 표시하는 sessionStorage 키. */
const SHAKA_RELOAD_KEY = 'selah-shaka-reload'

/** 이 브라우징 세션에서 shaka 청크 복구용 리로드를 시도한 적이 있는가(진단용). */
export function didAttemptShakaChunkReload(): boolean {
  try {
    return sessionStorage.getItem(SHAKA_RELOAD_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * shaka 청크를 못 받은 문서를 **리로드 한 번으로** 복구한다. 반환값 `true`면 리로드를
 * 시작했으므로 호출부는 즉시 중단해야 한다.
 *
 * 왜 리로드밖에 없나: `import()`가 한 번 실패하면 **ES 모듈 맵이 그 실패를 문서 단위로
 * 캐시**해 같은 specifier를 다시 fetch하지 않는다. 서버에 청크를 되돌려 놔도 그 문서에서는
 * 영원히 못 받는다(실측: 재생 3회 동안 청크 요청 1건, 리로드 후에야 200).
 * `loadShaka()`가 `shakaLoadPromise`를 null로 되돌리는 재시도 장치는 이 때문에 무력하다.
 *
 * 왜 이게 필요한가: 트리거가 **정상 배포 그 자체**다. 앱을 열어둔 사용자의 문서는 옛 해시
 * 청크를 가리키는데 배포가 `assets/`를 갈아치우면 그 파일이 사라진다. 그 세션은 리로드
 * 전까지 계속 27.8초 progressive다.
 *
 * 무한 리로드 방지가 이 함수의 핵심이다 — 청크가 **진짜로** 영구히 없을 수도 있으므로
 * 세션당 1회로 묶는다. 플래그를 못 쓰는 환경(사파리 프라이빗 등)에서는 아예 리로드하지
 * 않는다(리로드 루프보다 느린 재생이 낫다). 리로드 후에도 실패하면 조용히 progressive로
 * 가는 것이 올바른 최종 상태다.
 */
export function reloadOnceForShakaChunk(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (sessionStorage.getItem(SHAKA_RELOAD_KEY) === '1') return false
    // **반드시 리로드 전에** 세운다. 이 쓰기가 실패하면 리로드도 하지 않는다(루프 방지).
    sessionStorage.setItem(SHAKA_RELOAD_KEY, '1')
  } catch {
    return false
  }
  void (async () => {
    // 새 index.html/청크 해시를 받으려면 SW 등록을 먼저 갱신하는 편이 확실하다.
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.update()
    } catch {
      /* 미지원/실패 — 리로드는 그대로 진행 */
    }
    // HashRouter라 URL이 그대로여서 리로드 후 같은 설교 페이지로 돌아온다.
    location.reload()
  })()
  return true
}

/**
 * shaka가 이 브라우저에서 MSE/ManagedMediaSource로 재생 가능한지.
 * DASH 진입 전에 반드시 확인한다 — iOS 17.1 미만 Safari처럼 MSE가 아예 없는 기기에서
 * 그냥 load()하면 실패해 **소리조차 안 난다**(오디오 폴백 경로로 떨어뜨려야 한다).
 */
export async function checkDashSupport(): Promise<DashSupport> {
  // MSE 계열이 하나도 없으면 isBrowserSupported()도 어차피 false다.
  // 여기서 끊어 shaka(~800KB) 다운로드 자체를 막는다(미지원 기기는 대개 구형 단말).
  if (
    typeof window !== 'undefined' &&
    !('MediaSource' in window) &&
    !('ManagedMediaSource' in window)
  ) {
    return 'unsupported'
  }
  let ns: ShakaNamespace
  try {
    ns = await loadShaka()
  } catch {
    // 청크를 못 받았을 뿐 기기는 멀쩡할 수 있다 — 여기서 'unsupported'로 뭉개면 안 된다.
    return 'load-failed'
  }
  return ns.Player.isBrowserSupported() ? 'supported' : 'unsupported'
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
  // 정리가 진행 중이면 끝날 때까지 기다린다. 안 기다리면 teardown의 `removeAttribute('src')`
  // + `load()`가 **새로 attach한 뒤에** 도착해 방금 만든 MediaSource를 지운다.
  if (teardownPromise) await teardownPromise
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
  // 이 아래는 모듈 변수 `player` 대신 지역 `p`를 쓴다. attach/detach를 await하는 동안
  // `destroyDash()`가 끼어들면 `player`가 null이 되어 `player.attach()`가 TypeError를 낸다.
  const p = player
  // 다른 엘리먼트에 붙어 있으면 명시적으로 뗀다. detach()가 이전 엘리먼트의 MediaSource와
  // `<source>` 자식을 정리하고 disableRemotePlayback도 원복하므로(shaka
  // `media_source_engine.js`), 그 엘리먼트에 다시 `src`를 쓰는 progressive 경로가 살아난다.
  if (attachedEl && attachedEl !== el) {
    try {
      await p.detach()
    } catch {
      /* 이미 떨어진 상태 — 무시 */
    }
    attachedEl = null
  }
  await p.attach(el)
  // attach를 기다리는 사이 destroyDash()가 이 인스턴스를 버렸으면(정지/모드 전환) 여기서
  // 상태를 세우면 안 된다 — 죽은 Player를 attach된 것처럼 등록하는 꼴이 된다.
  // 호출부는 이어지는 loadDash()가 "attach 안 됨"으로 실패해 progressive로 폴백한다.
  if (player !== p) return
  attachedEl = el
  // 오디오 전용 제한. shaka는 `<audio>`에 붙으면 스스로 `manifest.disableVideo`를 켜지만
  // (`lib/player.js` applyConfig_: "Don't read video segments if the player is attached to an
  // audio element"), 싱글턴이 `<video>`에서 옮겨온 경우까지 확실히 하려고 명시한다.
  // 이게 켜지면 DASH 파서가 video AdaptationSet을 아예 무시해 **비디오 바이트를 0 받는다.**
  //
  // `restrictions.maxHeight = 0`을 쓰면 안 된다: 이 매니페스트는 audio 1 + video 3 구성이라
  // shaka DASH 파서가 audio×video 조합 variant만 만든다(audio-only variant 없음). 그 상태에서
  // 모든 variant를 제한하면 RESTRICTIONS_CANNOT_BE_MET(4012)로 재생이 죽는다.
  p.configure({ manifest: { disableVideo: el.nodeName === 'AUDIO' } })
}

/**
 * shaka가 이 엘리먼트를 소유(attach)하고 있는가 — **정리(teardown) 진행 중도 포함한다.**
 * 참이면 엘리먼트의 `src`를 밖에서 건드리면 안 되고, 먼저 `destroyDash()`를 await해야 한다.
 *
 * `unload()`는 src를 비우지만 attach는 유지하므로 src 유무로는 판별할 수 없다.
 * `player`만 보면 안 되는 이유는 `destroyDash()` 주석 참조 — destroy 중에도 shaka가
 * 엘리먼트의 src를 지우므로, 그 구간을 "안전"으로 답하면 방금 물린 src를 빼앗긴다.
 */
export function isDashAttached(el: HTMLMediaElement | null | undefined): boolean {
  if (el == null || attachedEl !== el) return false
  return player != null || teardownPromise != null
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

/**
 * 모드 전환/언마운트/progressive 복귀: Player를 완전히 파괴한다(detach 포함).
 *
 * **teardown이 끝날 때까지 `attachedEl`을 비우지 않는다.** `p.destroy()`는 비동기이고 그
 * 과정에서 **엘리먼트를 직접 건드린다** — `player.js`의 정리 경로가 `Dom.clearSourceFromVideo()`
 * (`dom_utils.js`: `removeAttribute('src')` + `video.load()`)와 `media_source_engine.js`의
 * 정리를 부른다. 예전처럼 플래그를 동기로 지우면 그 사이 `isDashAttached()`가 false를 답해
 * 호출부가 "이미 놓였다"고 믿고 `audio.src = 로컬파일`을 물리는데, 뒤늦은 teardown이 그 src를
 * 지워버린다 → `play()`가 AbortError → 캐시 watchdog이 3초 뒤 손상으로 오판 →
 * **멀쩡한 다운로드 파일이 삭제되고 재다운로드된다.**
 *
 * 그래서 진행 중 teardown Promise를 보관해 idempotent로 만든다. 중복 호출은 같은 Promise를
 * 돌려주므로 `await destroyDash()` 한 번이면 정리 완료가 보장된다.
 */
export async function destroyDash(): Promise<void> {
  if (teardownPromise) return teardownPromise
  const p = player
  errorHandler = null
  revokeManifestBlob()
  if (!p) {
    attachedEl = null
    return
  }
  // player만 먼저 끊어 새 load/unload가 죽은 인스턴스를 잡지 않게 한다.
  // attachedEl은 아래 teardown이 끝난 뒤에 비운다(위 설명).
  player = null
  teardownPromise = (async () => {
    try {
      await p.destroy()
    } catch {
      /* 무시 */
    } finally {
      attachedEl = null
      teardownPromise = null
    }
  })()
  return teardownPromise
}

/** load()가 새 load/unload에 의해 취소된 것인지(=사용자에게 보일 에러가 아님). */
export function isDashAbortError(err: unknown): boolean {
  const code = (err as { code?: number } | null)?.code
  return code === LOAD_INTERRUPTED || code === OPERATION_ABORTED
}
