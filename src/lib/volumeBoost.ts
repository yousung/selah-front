/**
 * "소리 크게" — 재생 중인 미디어 엘리먼트를 Web Audio 그래프(Gain → 리미터 → 스피커)에 연결해 실시간으로 키운다.
 *
 * 왜 실시간인가(2026-11-14 비교 테스트): 저장 파일 재인코딩, shaka 구간 재인코딩, 실시간 Web Audio 셋을
 * 구현해 비교했고, 사용자가 PC에서 실제로 커진다고 확인한 건 실시간뿐이었다. `<audio>.volume`은 1.0이
 * 상한이고(iOS는 읽기 전용), 이것이 브라우저에서 100%를 넘기는 표준 방법이다.
 *
 * 무음 방지 규칙(이 파일의 핵심):
 * - `createMediaElementSource`는 **되돌릴 수 없다**. 연결된 엘리먼트는 이후 그래프로만 소리를 낸다.
 *   → 기능을 처음 쓸 때만, AudioContext가 실제로 running일 때만 연결한다(suspended에 연결하면 무음).
 *   → 연결된 뒤엔 배율과 무관하게 재생 때마다 컨텍스트를 깨운다.
 * - 교차 출처 미디어를 CORS 없이 받은 상태로 연결하면 그래프 출력이 0(무음)이다.
 *   → 실제로 **CORS로 로드됐는지**를 `loadstart` 시점의 crossOrigin으로 기록해 판정한다(속성만 보면 속는다).
 *   → 연결하는 순간 crossOrigin을 고정해, 이후 어떤 경로(핸드오프 등)가 src를 바꿔도 CORS로 받게 한다.
 *   스트림은 전부 Invidious 프록시(youtube.lovizu.com, latest_version 폴백 포함)라 CORS를 허용한다(실측).
 * - iOS: WebKit Bug 221334(Web Audio 경유 시 끊김)로 2.4.20에서 같은 방식을 제거한 이력이 있다.
 *   이번엔 `navigator.audioSession.type = 'playback'`을 같이 켠다. iPhone 실기기 검증 전.
 */

let _ctx: AudioContext | null = null
let _gain: GainNode | null = null
let _limiter: DynamicsCompressorNode | null = null
const _sources = new Map<HTMLMediaElement, MediaElementAudioSourceNode>()
// 마지막 로드(loadstart) 때 crossOrigin이 켜져 있었는가 = 지금 리소스가 CORS로 받아졌는가.
const _loadedWithCors = new WeakMap<HTMLMediaElement, boolean>()
// crossOrigin을 켜고 다시 여는 중 — 새 src가 로드되기 전엔 연결/재오픈을 또 하지 않는다.
const _reopening = new WeakSet<HTMLMediaElement>()

if (typeof document !== 'undefined') {
  // 미디어 이벤트는 버블링하지 않지만 캡처 단계에서는 문서까지 온다.
  document.addEventListener('loadstart', (e) => {
    const el = e.target
    if (!(el instanceof HTMLMediaElement)) return
    _loadedWithCors.set(el, el.crossOrigin === 'anonymous')
    _reopening.delete(el)
  }, true)
}

export function isVolumeBoostSupported(): boolean {
  return typeof window !== 'undefined' &&
    (typeof window.AudioContext !== 'undefined' || 'webkitAudioContext' in window)
}

function ensureGraph(): AudioContext {
  if (_ctx) return _ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctor({ latencyHint: 'playback' })
  const gain = ctx.createGain()
  // 리미터: 키운 소리의 피크가 0dBFS를 넘어 찢어지지 않게 누른다(배율 1이면 setVolumeBoostGain이 끈다).
  const limiter = ctx.createDynamicsCompressor()
  limiter.knee.value = 3
  limiter.ratio.value = 20
  limiter.attack.value = 0.002
  limiter.release.value = 0.1
  limiter.threshold.value = 0
  gain.connect(limiter)
  limiter.connect(ctx.destination)
  _ctx = ctx
  _gain = gain
  _limiter = limiter
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  } catch {}
  const wake = () => { if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {}) }
  // 화면 복귀, 인터럽트(전화·Siri 등) 뒤 멈춘 컨텍스트를 다시 깨운다. 연결된 엘리먼트는 컨텍스트가 멈추면 무음이다.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake() })
  ctx.onstatechange = () => {
    if (ctx.state === 'running') return
    for (const el of _sources.keys()) if (!el.paused) { wake(); break }
  }
  return ctx
}

async function ensureRunning(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === 'running') return true
  try {
    await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))])
  } catch {}
  return (ctx.state as string) === 'running'
}

/**
 * 사용자 클릭 핸들러 안에서 **동기로** 부른다. iOS는 제스처 안에서만 AudioContext를 시작시킨다
 * (effect·이벤트 콜백은 제스처 밖일 수 있다).
 */
export function unlockVolumeBoost(): void {
  if (!isVolumeBoostSupported()) return
  try {
    const ctx = ensureGraph()
    if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  } catch {}
}

/**
 * 재생을 시작하는 사용자 동작(재생 버튼, 잠금화면 재생, 곡 선택) 안에서 **동기로** 부른다.
 * - 이미 연결된 엘리먼트가 있으면: 인터럽트(전화·Siri 등)로 멈춘 컨텍스트를 제스처 안에서 깨운다(안 깨면 무음).
 * - 이번 곡이 증폭 곡이면: 새로고침/자동 다음곡 뒤에도 제스처 안에서 컨텍스트를 만들어 둔다(제스처 밖에서 만들면 iOS는 suspended).
 */
export function wakeVolumeBoost(wantBoost: boolean): void {
  if (_sources.size > 0 || wantBoost) unlockVolumeBoost()
}

export function isVolumeBoostAttached(el: HTMLMediaElement | null | undefined): boolean {
  return !!el && _sources.has(el)
}

function isCrossOriginSrc(el: HTMLMediaElement): boolean {
  const src = el.currentSrc || el.src
  if (!src || src.startsWith('blob:') || src.startsWith('data:')) return false
  try {
    return new URL(src, location.href).origin !== location.origin
  } catch {
    return false
  }
}

/** 지금 리소스가 교차 출처인데 CORS 없이 받아져 있어, crossOrigin을 켜고 다시 열어야 하는가. */
export function needsCorsReload(el: HTMLMediaElement): boolean {
  if (_sources.has(el) || !isCrossOriginSrc(el)) return false
  return _loadedWithCors.get(el) !== true
}

/** crossOrigin을 켜고 다시 열기 시작했음을 표시(새 src의 loadstart까지 재오픈·연결 보류). */
export function markCorsReopen(el: HTMLMediaElement): void {
  el.crossOrigin = 'anonymous'
  _reopening.add(el)
  // 재오픈이 새 src까지 못 가면(스트림 API 실패 등) loadstart가 안 와 플래그가 남는다 — 그 곡의 증폭이 영영 막히지 않게 푼다.
  setTimeout(() => _reopening.delete(el), 4000)
}

export function isCorsReopening(el: HTMLMediaElement): boolean {
  return _reopening.has(el)
}

/**
 * 엘리먼트를 그래프에 연결한다(엘리먼트당 1회). 연결돼 있으면 컨텍스트만 깨운다.
 * 컨텍스트를 running으로 만들 수 없거나 CORS 없이 받은 교차 출처 리소스면 연결하지 않고 false —
 * 그 경우 소리는 증폭 없이 정상으로 난다(무음보다 낫다).
 */
export async function attachVolumeBoost(el: HTMLMediaElement): Promise<boolean> {
  if (_sources.has(el)) {
    await ensureRunning(_ctx!)
    return true
  }
  if (_reopening.has(el) || needsCorsReload(el)) return false
  // 화면이 꺼진 상태(백그라운드 핸드오프·자동 다음곡)에서 처음 연결하지 않는다 — iOS가 숨은 페이지의
  // 컨텍스트를 멈추면 잠금화면 소리가 무음이 되고, 연결은 되돌릴 수 없다. 화면 복귀 후 재생 때 연결된다.
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false
  const ctx = ensureGraph()
  if (!(await ensureRunning(ctx))) return false
  if (_sources.has(el)) return true
  if (_reopening.has(el) || needsCorsReload(el)) return false
  if (document.visibilityState === 'hidden') return false
  // 분리된 옛 엘리먼트(모드 전환으로 언마운트된 <video>)는 그래프에서 떼어 누수를 막는다.
  for (const [old, node] of _sources) {
    if (!old.isConnected) { try { node.disconnect() } catch {} _sources.delete(old) }
  }
  try {
    // 이후 어떤 경로가 src를 바꿔도 CORS로 받게 고정한다(지금 리소스는 같은 출처/blob/이미 CORS라 다시 받지 않는다).
    el.crossOrigin = 'anonymous'
    const src = ctx.createMediaElementSource(el)
    src.connect(_gain!)
    _sources.set(el, src)
    return true
  } catch {
    return false
  }
}

/** 현재 곡 배율을 적용한다(그래프가 있을 때만). 1이면 리미터도 사실상 끈다. */
export function setVolumeBoostGain(level: number): void {
  if (!_ctx || !_gain || !_limiter) return
  const t = _ctx.currentTime
  _gain.gain.setTargetAtTime(level, t, 0.03)
  _limiter.threshold.setTargetAtTime(level > 1 ? -3 : 0, t, 0.03)
}
