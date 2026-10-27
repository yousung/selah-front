import { useCallback, useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react'
import { api } from '@/lib/api'
import { isDashAttached } from '@/lib/dashPlayer'
import { getCachedMediaPlaybackUrl, isOpfsSupported } from '@/lib/mediaStore'
import { isIOS } from '@/lib/platform'

/**
 * 비디오 모드 백그라운드 오디오 핸드오프.
 *
 * 모바일 브라우저(특히 iOS Safari)는 페이지가 백그라운드로 가거나 화면이 잠기면 `<video>`를
 * 멈춘다. 비디오 모드에서도 소리는 이어져야 하므로, 숨겨지는 순간 같은 위치에서 상시 마운트된
 * `<audio>`로 **오디오만** 이어 재생하고, 다시 보이면 오디오 위치에서 `<video>`(shaka DASH)를
 * 재개한 뒤 오디오를 멈춘다.
 *
 * - 오디오 소스: 저장된 `${id}-audio`(비디오 저장의 짝 파일 포함)가 있으면 그것, 없으면
 *   `/audios/:id/stream`이 JSON으로 준 URL(폴백 `latest_version` 포함)을 `<audio src>`에
 *   직접 건다. 백엔드는 URL만 주고 바이트는 거치지 않는다.
 * - 준비(preload): 비디오가 로드되면 그 곡의 오디오 URL을 미리 `<audio>`에 물려 둔다 —
 *   숨겨지는 순간엔 await 없이 바로 `play()`할 수 있어야 하기 때문이다(iOS는 progressive
 *   fMP4를 파일을 다 받은 뒤에야 재생하므로 iOS만 `preload="auto"`로 미리 받는다).
 * - iOS 제스처: `<audio>`는 `playVideo()`가 첫 await 이전에 `primeMediaElement`로 언락한다.
 *   WebKit은 엘리먼트별 언락을 src가 바뀌어도 유지하므로 제스처 없는 백그라운드 `play()`가
 *   허용된다는 전제다(실기기 미검증).
 * - 핸드오프 중에는 `activeRef`가 true다. AudioContext의 `isVideoPlayback()`이 이걸 보고
 *   false를 답하므로 togglePlay/seek/잠금화면 Media Session 핸들러가 `<audio>`를 조작하고,
 *   `<audio>`의 기존 리스너(timeupdate/ended/play/pause)가 위치·종료·자동다음을 그대로 몬다.
 * - 백그라운드 중 큐 자동다음: `playVideo()`는 그대로 비디오 분기를 타서 `<video>`에 DASH를
 *   로드하되 `onVideoLoaded()`가 true를 돌려주면 `<video>`를 재생하지 않고 이 훅이 새 곡을
 *   오디오로 튼다. 복귀 시 `<video>`는 이미 그 곡이라 seek + play만 하면 된다.
 * - 데스크탑은 탭이 숨겨져도 `<video>`가 계속 재생되므로 대상이 아니다(모바일 한정).
 */

interface Options {
  audioRef: RefObject<HTMLAudioElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  /** AudioContext가 소유하고 `isVideoPlayback()`이 참조하는 핸드오프 플래그. */
  activeRef: MutableRefObject<boolean>
  /** 핸드오프가 꺼진 상태 기준의 "`<video>` DASH로 재생 중인가". */
  isVideoPlayback: () => boolean
  isPlayingRef: RefObject<boolean>
  currentIdRef: RefObject<string | null>
  positionRef: RefObject<number>
  qualityRef: RefObject<string>
  /** `<video>`를 그 곡으로 다시 로드해 이어 튼다(복귀 시 `<video>`에 다른 곡이 물려 있을 때). */
  reloadVideoAt: (seekTo: number, autoPlay: boolean) => void
}

function isHandoffPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return isIOS() || /Android/i.test(navigator.userAgent)
}

function isPictureInPicture(video: HTMLVideoElement): boolean {
  if (typeof document !== 'undefined' && document.pictureInPictureElement === video) return true
  return (video as HTMLVideoElement & { webkitPresentationMode?: string }).webkitPresentationMode === 'picture-in-picture'
}

/** iOS가 visibilitychange 직전에 `<video>`를 먼저 멈추는 경우를 "재생 중이었다"로 보는 창(ms). */
const SYSTEM_PAUSE_WINDOW_MS = 1000

export function useBackgroundAudioHandoff(opts: Options) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  // `<audio>`에 물려 둔 핸드오프용 src와 그 곡 id. src 비교로 판정해야 다른 코드(iOS 프라이머,
  // 오디오 경로 전환)가 src를 갈아끼운 경우를 "준비 안 됨"으로 정확히 본다.
  const preparedRef = useRef<{ id: string; src: string } | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  // `<video>`(shaka)에 현재 로드된 곡 id — 복귀 시 seek만으로 될지, 다시 로드해야 할지 가른다.
  const videoLoadedIdRef = useRef<string | null>(null)
  const lastVideoPauseAtRef = useRef(0)
  // 백그라운드 play()가 거절됐는가 — 복귀 시 "재생 의도"로 본다(잠금화면에서 다시 누를 수 있게 상태는 유지).
  const playRejectedRef = useRef(false)
  const seqRef = useRef(0)

  const revokeBlob = () => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
  }

  const isPrepared = (audio: HTMLAudioElement, id: string) => {
    const p = preparedRef.current
    return !!p && p.id === id && audio.getAttribute('src') === p.src && !isDashAttached(audio)
  }

  const resolveAudioUrl = async (id: string): Promise<string | null> => {
    if (isOpfsSupported()) {
      try {
        const local = await getCachedMediaPlaybackUrl(id, 'audio')
        if (local) return local
      } catch { /* 저장분 조회 실패 → 스트림 */ }
    }
    try {
      const { data } = await api.get<{ url: string; fallback?: boolean }>(`/audios/${id}/stream`, {
        params: { quality: optsRef.current.qualityRef.current },
      })
      return data.url || null
    } catch {
      return null
    }
  }

  /** `<audio>`에 그 곡의 오디오 src를 물린다. 이미 물려 있으면 그대로 둔다. 실패/폐기 시 false. */
  const ensureAudioSource = async (id: string): Promise<boolean> => {
    const { audioRef, currentIdRef } = optsRef.current
    const audio = audioRef.current
    if (!audio) return false
    if (isPrepared(audio, id)) return true
    const seq = ++seqRef.current
    const url = await resolveAudioUrl(id)
    const stale = seq !== seqRef.current || currentIdRef.current !== id
    if (!url || stale || audioRef.current !== audio || isDashAttached(audio)) {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return false
    }
    revokeBlob()
    if (url.startsWith('blob:')) blobUrlRef.current = url
    audio.preload = isIOS() ? 'auto' : 'metadata'
    audio.src = url
    audio.load()
    preparedRef.current = { id, src: audio.getAttribute('src') ?? url }
    return true
  }

  const seekAudio = (audio: HTMLAudioElement, pos: number) => {
    if (!(pos > 0)) return
    // readyState 0이어도 currentTime 대입은 "기본 재생 시작 위치"로 남지만, 일부 엔진은 무시한다.
    // 메타데이터가 오면 한 번 더 맞춘다.
    try { audio.currentTime = pos } catch { /* 아래 loadedmetadata에서 재시도 */ }
    if (audio.readyState < 1) {
      const onMeta = () => {
        if (optsRef.current.activeRef.current && Math.abs(audio.currentTime - pos) > 1) {
          try { audio.currentTime = pos } catch { /* noop */ }
        }
      }
      audio.addEventListener('loadedmetadata', onMeta, { once: true })
    }
  }

  const playAudio = (audio: HTMLAudioElement) => {
    playRejectedRef.current = false
    audio.play().catch(() => { playRejectedRef.current = true })
  }

  /** 오디오로 이어 재생한다. 호출 전에 `activeRef`가 켜져 있어야 한다. */
  const playAudioFrom = async (id: string, pos: number, autoPlay: boolean) => {
    const { audioRef, activeRef, currentIdRef } = optsRef.current
    const ok = await ensureAudioSource(id)
    const audio = audioRef.current
    if (!ok || !audio || !activeRef.current || currentIdRef.current !== id) return
    seekAudio(audio, pos)
    if (autoPlay) playAudio(audio)
  }

  const startHandoff = () => {
    const { audioRef, videoRef, activeRef, isVideoPlayback, currentIdRef } = optsRef.current
    if (activeRef.current || !isHandoffPlatform() || !isVideoPlayback()) return
    const audio = audioRef.current
    const video = videoRef.current
    const id = currentIdRef.current
    if (!audio || !video || !id || isDashAttached(audio) || isPictureInPicture(video)) return
    const pos = video.currentTime
    activeRef.current = true
    video.pause()
    if (isPrepared(audio, id)) {
      // await 없이 바로 재생 — 숨겨지는 이벤트 태스크 안에서 play()를 부른다.
      seekAudio(audio, pos)
      playAudio(audio)
    } else {
      void playAudioFrom(id, pos, true)
    }
  }

  const endHandoff = () => {
    const { audioRef, videoRef, activeRef, currentIdRef, positionRef, reloadVideoAt } = optsRef.current
    if (!activeRef.current) return
    const audio = audioRef.current
    const id = currentIdRef.current
    const hasAudio = !!audio && audio.readyState >= 1 && !!audio.getAttribute('src')
    const pos = hasAudio ? audio!.currentTime : (positionRef.current ?? 0)
    const wasPlaying = (!!audio && !audio.paused) || playRejectedRef.current
    playRejectedRef.current = false
    // 플래그를 먼저 내린다 — 이후 이벤트(오디오 pause, 비디오 play)는 비디오 기준으로 처리된다.
    activeRef.current = false
    // src는 남겨 둔다(같은 곡이면 다음 핸드오프가 즉시 시작된다).
    audio?.pause()
    if (!id) return // 백그라운드에서 정지(stop)됨
    const video = videoRef.current
    if (video && videoLoadedIdRef.current === id && isDashAttached(video)) {
      try { video.currentTime = pos } catch { /* noop */ }
      if (wasPlaying) video.play().catch(() => {})
    } else {
      reloadVideoAt(pos, wasPlaying)
    }
  }

  // 숨김/복귀 감지. 리스너는 한 번만 단다(최신 옵션은 optsRef로 읽는다).
  useEffect(() => {
    const wasPlayingAtHide = () => {
      const { isPlayingRef } = optsRef.current
      return !!isPlayingRef.current || performance.now() - lastVideoPauseAtRef.current < SYSTEM_PAUSE_WINDOW_MS
    }
    const onHidden = () => {
      if (optsRef.current.activeRef.current) return
      if (!wasPlayingAtHide()) return
      startHandoff()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHidden()
      else endHandoff()
    }
    const onPageShow = () => { if (document.visibilityState === 'visible') endHandoff() }
    // 미디어 이벤트는 버블링하지 않지만 캡처 단계에선 document까지 내려온다.
    const onMediaPause = (e: Event) => {
      const { videoRef, activeRef } = optsRef.current
      if (e.target !== videoRef.current) return
      if (activeRef.current) return // 핸드오프가 직접 멈춘 것
      lastVideoPauseAtRef.current = performance.now()
      // 이미 숨겨진 뒤에 시스템이 <video>를 멈췄다(iOS 잠금 순서) → 지금 넘긴다.
      if (document.visibilityState === 'hidden') startHandoff()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHidden)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('pause', onMediaPause, true)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHidden)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('pause', onMediaPause, true)
    }
    // startHandoff/endHandoff는 optsRef만 읽으므로 의존성이 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => revokeBlob(), [])

  /**
   * 비디오 분기에서 `loadDash()` 성공 직후 호출한다. 핸드오프 중이거나(백그라운드 자동다음),
   * 숨겨진 상태에서 자동재생하려는 경우 이 훅이 오디오로 틀고 true를 돌려준다 —
   * 호출자는 `<video>`를 재생하지 말아야 한다. 그 외엔 오디오를 미리 준비하고 false.
   */
  const onVideoLoaded = useCallback((id: string, startPos: number, autoPlay: boolean): boolean => {
    videoLoadedIdRef.current = id
    if (!isHandoffPlatform()) return false
    const { activeRef } = optsRef.current
    if (activeRef.current || (autoPlay && document.visibilityState === 'hidden')) {
      activeRef.current = true
      optsRef.current.videoRef.current?.pause()
      void playAudioFrom(id, startPos, autoPlay)
      return true
    }
    void ensureAudioSource(id)
    return false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 새 재생 시작 시(핸드오프 중이 아니면) 이전 곡용으로 준비해 둔 `<audio>` src를 내려놓는다 —
   * 남겨 두면 `<audio>`의 canplay 자동재생 재시도가 옛 곡을 틀 수 있다.
   */
  const discardPrepared = useCallback(() => {
    const { audioRef, activeRef } = optsRef.current
    if (activeRef.current) return
    seqRef.current++
    const audio = audioRef.current
    const p = preparedRef.current
    preparedRef.current = null
    if (audio && p && audio.getAttribute('src') === p.src && !isDashAttached(audio)) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    if (audio) audio.preload = 'metadata'
    revokeBlob()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 정지·모드 전환 시 핸드오프 상태를 완전히 내린다(오디오도 멈춘다). */
  const reset = useCallback(() => {
    const { audioRef, activeRef } = optsRef.current
    activeRef.current = false
    playRejectedRef.current = false
    videoLoadedIdRef.current = null
    if (preparedRef.current && audioRef.current && !isDashAttached(audioRef.current)) audioRef.current.pause()
    discardPrepared()
  }, [discardPrepared])

  // 반환 객체를 고정한다 — AudioContext의 effect/useCallback 의존성에 들어가므로 매 렌더 새 객체면 모드 전환 effect가 매번 돈다.
  return useMemo(() => ({ onVideoLoaded, discardPrepared, reset }), [onVideoLoaded, discardPrepared, reset])
}
