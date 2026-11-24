/**
 * YouTube IFrame Player API 로더 (https://developers.google.com/youtube/iframe_api_reference).
 * `https://www.youtube.com/iframe_api` 스크립트를 한 번만 넣고, `onYouTubeIframeAPIReady` 이후 `window.YT`를 돌려준다.
 * 방송중(`isLive`) 영상 전용 — 실시간 스트림은 Invidious/백엔드를 거치지 않고 유튜브 공식 플레이어가 직접 받는다.
 */

export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  destroy(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
}

export interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

export interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    opts: {
      /** 기존 iframe(enablejsapi=1)에 붙일 때는 생략 */
      videoId?: string
      width?: string | number
      height?: string | number
      host?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (e: YTPlayerEvent) => void
        onStateChange?: (e: YTPlayerEvent) => void
        onError?: (e: YTPlayerEvent) => void
      }
    },
  ) => YTPlayer
  PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let _loading: Promise<YTNamespace> | null = null

export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (_loading) return _loading
  const loading = new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    const s = document.createElement('script')
    // iframe_api가 이어서 받는 www-widgetapi.js가 막히면(콘텐츠 차단기·불안정한 망) ready가 영영 안 온다 →
    // 시간 제한으로 실패 처리해 오버레이가 "YouTube에서 보기"를 보이게 하고, 다음 열기에서 다시 시도한다.
    const fail = (msg: string) => {
      clearTimeout(timer)
      if (_loading === loading) _loading = null
      s.remove()
      reject(new Error(msg))
    }
    const timer = setTimeout(() => fail('YT API load timeout'), 15000)
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      clearTimeout(timer)
      if (window.YT?.Player) resolve(window.YT)
      else fail('YT API not available')
    }
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => fail('YT API script failed to load')
    document.head.appendChild(s)
  })
  _loading = loading
  return loading
}
