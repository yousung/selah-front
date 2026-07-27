import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, ReactNode, RefObject, SyntheticEvent } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useRecentStore } from '@/store/recentStore'
import { useQueueStore } from '@/store/queueStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { api } from '@/lib/api'
import { deleteMedia, getCachedMediaPlaybackUrl, isOpfsSupported, MEDIA_DOWNLOADED_EVENT, MEDIA_CORRUPT_EVENT } from '@/lib/mediaStore'
import type { MediaDownloadedDetail } from '@/lib/mediaStore'
import { setLastPlayback, setLastPlaybackError } from '@/lib/mediaDiag'
import { thumbUrl, thumbQualityFor } from '@/lib/thumb'
import { saveSermonResume, clearSermonResume } from '@/lib/sermonResume'
import { isLiveVideo } from '@/lib/liveVideo'

interface VideoInfo {
  id: string
  youtubeId?: string | null
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  hymnTitle?: string | null
  duration?: number | null
  chapter?: number | null
  playerPath?: string
  isSecret?: boolean | string | null
  isLive?: boolean | string | null
  categoryId?: string
  categoryTitle?: string
}

interface VideoDetail {
  id: string
  youtubeId?: string | null
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  hymnTitle?: string | null
  chapter?: number | null
  duration?: number | null
  playerPath?: string | null
  lyric?: { hymnTitle?: string | null } | null
  isSecret?: boolean | string | null
  isLive?: boolean | string | null
}

interface AudioContextValue {
  currentVideo: VideoInfo | null
  isPlaying: boolean
  isLoading: boolean
  isEnded: boolean
  duration: number
  autoNextProgress: number | null
  error: string | null
  volume: number
  videoUrl: string | null
  reactPlayerRef: RefObject<HTMLVideoElement | null>
  videoSlotRef: RefObject<HTMLDivElement | null>
  playVideo: (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean; seekTo?: number }) => Promise<void>
  stop: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  seekBy: (delta: number) => void
  seekFraction: (fraction: number) => void
  cancelAutoNext: () => void
  setVolume: (v: number) => void
  onVideoPlay: () => void
  onVideoPause: () => void
  onVideoWaiting: () => void
  onVideoCanPlay: () => void
  onVideoTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => void
  onVideoLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => void
  onVideoDurationChange: (e: SyntheticEvent<HTMLVideoElement>) => void
  onVideoEnded: () => void
  onVideoError: () => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)
const PositionCtx = createContext<number>(0)

// 이번 세션 동안 로컬 재생을 건너뛰고 스트림으로만 가는 cacheKey(id-type) 집합.
// iOS에서 SW-라우팅 실패성 에러(NETWORK/SRC_NOT_SUPPORTED)에 파일을 보존한 채
// 폴백할 때, 재생→getCachedMediaPlaybackUrl→swUrl→다시 에러 무한루프를 막는다.
// (probe 0-0 206 성공이 전체 재생 성공을 보장하지 않기 때문.) reload 시 초기화.
const _forceStreamThisSession = new Set<string>()

// 손상 판정 후 1회 재다운로드를 시도한 cacheKey(id-type) 집합. 재다운로드한 파일이
// 또 손상이면(3초 무진행) 무한 재다운로드 루프를 막기 위해 이번 세션은 스트림으로 폴백한다.
// 재생이 실제로 진행되면(syncPosition) 해당 키를 비워 다음 손상 시 다시 재다운로드한다.
const _corruptRetriedThisSession = new Set<string>()

function stripBrackets(title: string) {
  return title.replace(/\[.*?\]/g, '').trim()
}

function updateMediaSessionMetadata(video: VideoInfo) {
  if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return
  const subtitle = stripBrackets(video.title)
  const title = video.hymnTitle?.trim() || subtitle || video.title

  const { mediaMode, quality } = useSettingsStore.getState()
  const artworkSrc = thumbUrl(video.thumbnail, thumbQualityFor(mediaMode, quality))

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist: subtitle || '주님의 교회',
    album: 'Selah',
    artwork: artworkSrc
      ? [
          { src: artworkSrc, sizes: '96x96' },
          { src: artworkSrc, sizes: '128x128' },
          { src: artworkSrc, sizes: '192x192' },
          { src: artworkSrc, sizes: '256x256' },
          { src: artworkSrc, sizes: '384x384' },
          { src: artworkSrc, sizes: '512x512' },
        ]
      : undefined,
  })
}

function clearMediaSessionMetadata() {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = null
  navigator.mediaSession.playbackState = 'none'
  if (typeof navigator.mediaSession.setPositionState === 'function') {
    try { navigator.mediaSession.setPositionState() } catch { /* noop */ }
  }
}

function normalizeDbDuration(duration?: number | null) {
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : null
}

export function AudioProvider({ children }: { children: ReactNode }) {
  // audioRef는 오디오 재생용 단일 <audio> 엘리먼트를 가리킨다. 캐시(same-origin blob/sw)든
  // 스트림(cross-origin)이든 이 하나의 엘리먼트로 직접 재생한다. (과거 곡별 볼륨 증폭·노이즈
  // 필터를 위해 Web Audio 그래프에 배선한 boost 엘리먼트를 별도로 뒀으나, iOS WebKit의
  // MediaElementSource 재생 끊김 버그로 기능 자체를 제거하고 단순 재생으로 되돌렸다.)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reactPlayerRef = useRef<HTMLVideoElement | null>(null)
  const videoSlotRef = useRef<HTMLDivElement | null>(null)
  const quality = useSettingsStore((s) => s.quality)
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const autoNextDelay = useSettingsStore((s) => s.autoNextDelay)
  const playMode = useSettingsStore((s) => s.playMode)
  const playbackRate = useSettingsStore((s) => s.playbackRate)
  const queueIds = useQueueStore((s) => s.ids)
  const queueIndex = useQueueStore((s) => s.index)
  const setQueue = useQueueStore((s) => s.setQueue)
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [position, setPosition] = useState(0)
  const positionRef = useRef(0)
  // syncPosition에서 setPosition/updatePositionState(React 리렌더 유발)를 ~200ms로 스로틀하기 위한
  // 마지막 UI 동기화 시각. positionRef 자체 갱신/종료감지는 이 스로틀과 무관하게 매 timeupdate마다 수행.
  const lastUiSyncRef = useRef(0)
  const [duration, setDuration] = useState(0)
  const [autoNextProgress, setAutoNextProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(1)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const currentVideoDataRef = useRef<VideoInfo | null>(null)
  const playVideoRef = useRef<AudioContextValue['playVideo'] | null>(null)
  const localPlaybackRef = useRef<{ id: string; type: 'audio' | 'video' } | null>(null)
  const localFallbackInProgressRef = useRef(false)
  // 저장 파일 재생 감시 타이머(3초 무진행 → 손상 판정). 캐시 재생에만 설치한다.
  const cacheWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 손상→재다운로드 완료 시 재생을 재개할 대상(찬송 포함). MEDIA_DOWNLOADED 핸들러가 소비.
  const pendingCorruptReplayRef = useRef<{ id: string; type: 'audio' | 'video' } | null>(null)
  // 손상 판정 후 손상 파일을 떼어내는 동안(재다운로드 대기) 발생하는 미디어 error를
  // "재생 오류" 배너로 표시하지 않고 삼키기 위한 가드. 새 재생/진행 감지 시 해제된다.
  const corruptHandlingRef = useRef(false)
  const isPlayingRef = useRef(false)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { currentVideoDataRef.current = currentVideo }, [currentVideo])
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentVideo) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [currentVideo, isPlaying])
  // 재생 중 화면 자동잠금 방지(Screen Wake Lock). 지원 브라우저(iOS 16.4+ 등)에 한해 동작하며,
  // 사용자가 직접 전원버튼으로 잠그거나 앱을 백그라운드로 보내는 것은 막지 못한다(스펙상 탭이
  // hidden되면 잠금 자동 해제) — "자동 화면 꺼짐"만 방지한다. 탭이 다시 visible되면 재생 중일 때
  // 재요청한다.
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      if (!isPlaying || document.visibilityState !== 'visible') return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) { sentinel.release().catch(() => {}); sentinel = null }
      } catch { /* 미지원/거부 — 무시 */ }
    }
    void acquire()
    const onVisible = () => { if (document.visibilityState === 'visible') void acquire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [isPlaying])
  // ── 설교(SERMON) 재생위치 전역 저장: 5초마다 videoId별 맵에 기록 ──
  // PlayerPage가 아닌 전역(AudioContext)에 두어 미니재생바 상태에서도 기록되게 한다.
  // 끝나기 30초 전 이후면 다 들은 것으로 보고 해당 설교 위치를 삭제한다.
  useEffect(() => {
    const interval = setInterval(() => {
      const vid = currentVideoDataRef.current
      if (!vid || vid.type !== 'SERMON') return
      const dur = durationRef.current
      if (dur <= 0) return
      const pos = positionRef.current
      if (pos >= dur - 30) { clearSermonResume(vid.id); return }
      if (pos <= 0) return
      const mode = useSettingsStore.getState().mediaMode
      const downloaded = useCachedMediaStore.getState().cachedIds.has(`${vid.id}-${mode}`)
      saveSermonResume({
        videoId: vid.id,
        videoTitle: vid.title,
        categoryId: vid.categoryId,
        categoryTitle: vid.categoryTitle,
        position: pos,
        downloaded,
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])
  const pendingAutoPlayRef = useRef(false)
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentVideoIdRef = useRef<string | null>(null)
  const durationRef = useRef(0)
  const hasAuthoritativeDurationRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  // DB duration(currentVideo)을 절대 신뢰한다. Safari가 일부 AAC를 길이 2배(실콘텐츠+무음)로
  // 디코드해 element.duration이 틀려도, DB 값이 있으면 그것을 표시/재생바/종료감지/seek 클램프에
  // 모두 쓴다. DB 값이 없을 때만 element 파생 duration으로 폴백한다.
  const dbDuration = normalizeDbDuration(currentVideo?.duration)
  // DB 값만 신뢰. element.duration(Safari 2배 디코드)으로 폴백하지 않는다. DB가 없으면 0
  // (절대 element 2배를 표시하지 않음). _duration state는 내부 폴백 계산에만 남겨둔다.
  const effectiveDuration = dbDuration ?? 0
  void duration
  // durationRef/권위 플래그는 effectiveDuration 기준. syncPosition 종료감지·seek 클램프가
  // DB 길이를 써서 실제 끝에서 멈추고(무음 꼬리 제거) 시간 표시도 DB와 일치한다.
  useEffect(() => {
    durationRef.current = effectiveDuration
    hasAuthoritativeDurationRef.current = dbDuration != null
  }, [effectiveDuration, dbDuration])

  // 재생 객체가 duration 없이 들어오는 경로(persist된 큐 meta, 일부 preview/recent 등)가
  // 있어 currentVideo.duration이 undefined일 수 있다. 그러면 DB-신뢰 표시가 0이 된다.
  // currentVideo에 DB duration이 없으면 상세 API로 권위 duration을 가져와 패치한다.
  useEffect(() => {
    const cur = currentVideo
    if (!cur) return
    if (normalizeDbDuration(cur.duration) != null) return
    let cancelled = false
    api.get<VideoDetail>(`/videos/${cur.id}`)
      .then(({ data }) => {
        const d = normalizeDbDuration(data.duration)
        if (cancelled || d == null) return
        setCurrentVideo((v) => (v && v.id === cur.id ? { ...v, duration: d } : v))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [currentVideo?.id, currentVideo?.duration])
  // 배속은 설교(SERMON)에만 적용. 찬송 등 그 외 콘텐츠는 항상 정속(1).
  const playbackRateRef = useRef(playbackRate)
  useEffect(() => { playbackRateRef.current = playbackRate }, [playbackRate])
  const applyPlaybackRate = useCallback((media: HTMLMediaElement) => {
    const isSermon = currentVideoDataRef.current?.type === 'SERMON'
    media.playbackRate = isSermon ? playbackRateRef.current : 1
  }, [])
  // 재생 중 설정에서 배속 변경 시 즉시 반영(설교일 때만). currentVideo 의존으로
  // 곡 전환 시에도 재실행돼 정속/배속이 콘텐츠 타입에 맞게 갱신된다.
  useEffect(() => {
    if (audioRef.current) applyPlaybackRate(audioRef.current)
    if (reactPlayerRef.current) applyPlaybackRate(reactPlayerRef.current)
  }, [playbackRate, currentVideo, applyPlaybackRate])

  const updateActualDuration = useCallback((durationSeconds: number) => {
    if (hasAuthoritativeDurationRef.current) return
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return
    setDuration(durationSeconds)
  }, [])

  const getKnownDuration = useCallback((mediaDuration: number) => {
    if (Number.isFinite(durationRef.current) && durationRef.current > 0) return durationRef.current
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration
    return null
  }, [])

  // 잠금화면/Now Playing 재생바를 권위 duration(DB)에 맞춘다. setPositionState를 안 주면
  // iOS는 element.duration(Safari가 일부 AAC를 2배로 디코드)을 써서 잠금화면 총시간이
  // 포그라운드(DB값)보다 길어진다 → 끝으로 드래그 시 실제 끝을 넘어 다음곡으로 튄다.
  const updatePositionState = useCallback((media: HTMLMediaElement) => {
    if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return
    const duration = durationRef.current
    if (!Number.isFinite(duration) || duration <= 0) {
      // 권위 duration 미상 → 잔존 상태 클리어(2배값 노출 방지)
      try { navigator.mediaSession.setPositionState() } catch { /* noop */ }
      return
    }
    const position = Math.max(0, Math.min(positionRef.current, duration))
    const playbackRate = media.playbackRate || 1
    try {
      navigator.mediaSession.setPositionState({ duration, position, playbackRate })
    } catch { /* invalid state(예: position>duration 순간) 무시 */ }
  }, [])

  const syncPosition = useCallback((media: HTMLMediaElement) => {
    const knownDuration = durationRef.current
    const currentTime = media.currentTime

    // 실제 재생 진행 감지 → 손상 감시 타이머 해제 + 재다운로드 시도 플래그 초기화
    if (currentTime > 0) {
      if (cacheWatchdogRef.current) { clearTimeout(cacheWatchdogRef.current); cacheWatchdogRef.current = null }
      corruptHandlingRef.current = false
      const lp = localPlaybackRef.current
      if (lp) _corruptRetriedThisSession.delete(`${lp.id}-${lp.type}`)
    }

    if (hasAuthoritativeDurationRef.current && knownDuration > 0 && currentTime >= knownDuration) {
      media.pause()
      positionRef.current = knownDuration
      setPosition(knownDuration)
      setIsPlaying(false)
      setIsEnded(true)
      updatePositionState(media)
      return
    }

    positionRef.current = currentTime

    // React state(setPosition)/mediaSession 갱신은 ~200ms로 스로틀 — position은 timeupdate마다
    // (초당 수회) 바뀌어 이를 그대로 setState하면 useAudio() 소비자 13곳이 초당 수회 리렌더된다.
    // 증폭/노이즈필터(Web Audio worklet) 경로는 메인스레드 잼에 취약해 리렌더 폭주가 worklet
    // 언더런(미세 끊김)의 원인 중 하나였다. positionRef는 위에서 매번 갱신되므로 seek 등 즉시
    // 필요한 값 조회는 스로틀의 영향을 받지 않는다.
    const now = performance.now()
    if (now - lastUiSyncRef.current >= 200) {
      lastUiSyncRef.current = now
      setPosition(currentTime)
      updatePositionState(media)
    }
  }, [updatePositionState])

  const applySeek = useCallback((media: HTMLMediaElement, seconds: number) => {
    const knownDuration = getKnownDuration(media.duration)
    const target = knownDuration == null
      ? Math.max(0, seconds)
      : Math.max(0, Math.min(seconds, knownDuration))

    try {
      media.currentTime = target
      pendingSeekRef.current = null
      positionRef.current = target
      setPosition(target)
      setIsEnded(false)
      updatePositionState(media)
      return true
    } catch {
      pendingSeekRef.current = target
      setIsEnded(false)
      return false
    }
  }, [getKnownDuration, updatePositionState])

  const applyPendingSeek = useCallback((media: HTMLMediaElement) => {
    const pending = pendingSeekRef.current
    if (pending == null || media.readyState < 1) return
    applySeek(media, pending)
  }, [applySeek])

  const qualityRef = useRef(quality)
  useEffect(() => { qualityRef.current = quality }, [quality])
  const mediaModeRef = useRef(mediaMode)
  useEffect(() => { mediaModeRef.current = mediaMode }, [mediaMode])

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current)
      autoNextTimerRef.current = null
    }
    setAutoNextProgress(null)
  }, [])

  const clearCacheWatchdog = useCallback(() => {
    if (cacheWatchdogRef.current) {
      clearTimeout(cacheWatchdogRef.current)
      cacheWatchdogRef.current = null
    }
  }, [])

  // 저장(다운로드) 파일을 자동재생으로 틀 때만 호출한다. 3초 내 실제 재생 진행(position>0)이
  // 없으면 파일 손상으로 간주: 파일 삭제 후 재다운로드(MEDIA_CORRUPT_EVENT)를 트리거하고,
  // 재다운로드 후에도 손상이면 무한루프 방지로 스트림 폴백한다.
  const armCacheWatchdog = useCallback((id: string, type: 'audio' | 'video') => {
    clearCacheWatchdog()
    const key = `${id}-${type}`
    cacheWatchdogRef.current = setTimeout(() => {
      cacheWatchdogRef.current = null
      const lp = localPlaybackRef.current
      // 여전히 같은 로컬 재생이고, 다른 폴백이 진행 중이 아니며, 진행이 전혀 없을 때만 손상 처리
      if (!lp || `${lp.id}-${lp.type}` !== key) return
      if (localFallbackInProgressRef.current) return
      const isVideo = mediaModeRef.current === 'video'
      const media = isVideo ? reactPlayerRef.current : audioRef.current
      if (positionRef.current > 0 || (media?.currentTime ?? 0) > 0) return
      const activeVideo = currentVideoDataRef.current

      // 손상 확정: 캐시 재생 요청 후 3초간 재생이 시작/진행되지 않음.
      // 손상 파일을 떼어낸다(중단된 src로 인한 후속 error는 corruptHandlingRef로 삼킴).
      localPlaybackRef.current = null
      pendingAutoPlayRef.current = false
      corruptHandlingRef.current = true
      if (media) {
        media.pause()
        media.src = ''
        if (isVideo) { media.load(); setVideoUrl(null) }
      }
      setIsLoading(false)
      setIsPlaying(false)
      setLastPlaybackError({
        code: null,
        networkState: media?.networkState ?? null,
        readyState: media?.readyState ?? null,
        src: media?.src || null,
        preservedFile: false,
      })

      if (_corruptRetriedThisSession.has(key)) {
        // 재다운로드한 파일도 손상 → 무한 재다운로드 방지: 이번 세션은 스트림으로 폴백.
        _forceStreamThisSession.add(key)
        pendingCorruptReplayRef.current = null
        void deleteMedia(id, type).finally(() => {
          useCachedMediaStore.getState().refresh()
          if (activeVideo) {
            void playVideoRef.current?.(activeVideo, { autoPlay: true, skipRecentAdd: true, seekTo: 0 })
          }
        })
        return
      }

      // 첫 손상: 삭제 후 재다운로드 트리거. PlayerPage가 메시지 표시 + handleDownload 실행,
      // 다운로드 완료 시 MEDIA_DOWNLOADED 핸들러가 pendingCorruptReplay로 재생을 재개한다.
      _corruptRetriedThisSession.add(key)
      pendingCorruptReplayRef.current = { id, type }
      void deleteMedia(id, type)
        .finally(() => useCachedMediaStore.getState().refresh())
        .finally(() => window.dispatchEvent(new CustomEvent(MEDIA_CORRUPT_EVENT, { detail: { id, type } })))
    }, 3000)
  }, [clearCacheWatchdog])

  const isMountedRef = useRef(false)
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return }
    clearCacheWatchdog()
    pendingCorruptReplayRef.current = null
    corruptHandlingRef.current = false
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    if (reactPlayerRef.current) { reactPlayerRef.current.pause(); reactPlayerRef.current.src = '' }
    clearMediaSessionMetadata()
    cancelAutoNext()
    localPlaybackRef.current = null
    localFallbackInProgressRef.current = false
    pendingAutoPlayRef.current = false
    pendingSeekRef.current = null
    setVideoUrl(null)
    setCurrentVideo(null)
    currentVideoDataRef.current = null
    currentVideoIdRef.current = null
    hasAuthoritativeDurationRef.current = false
    setIsPlaying(false)
    setIsLoading(false)
    setIsEnded(false)
    positionRef.current = 0
    setPosition(0)
    setDuration(0)
    setError(null)
  }, [cancelAutoNext, clearCacheWatchdog, mediaMode])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const makeHandlers = (audio: HTMLAudioElement): [string, EventListener][] => [
      ['loadedmetadata', () => updateActualDuration(audio.duration)],
      ['durationchange', () => updateActualDuration(audio.duration)],
      ['loadedmetadata', () => applyPendingSeek(audio)],
      ['durationchange', () => applyPendingSeek(audio)],
      ['timeupdate', () => syncPosition(audio)],
      ['play', () => {
        pendingAutoPlayRef.current = false
        setIsPlaying(true); setIsLoading(false); updatePositionState(audio)
      }],
      ['pause', () => {
        setIsPlaying(false)
      }],
      ['waiting', () => setIsLoading(true)],
      ['canplay', () => {
        applyPendingSeek(audio)
        setIsLoading(false)
        // 모바일 브라우저는 동적 src 직후 play()를 보류하는 경우가 있다.
        // 실제 play 이벤트 전까지 자동재생 의도를 유지하고 재생 가능 시 다시 요청한다.
        if (pendingAutoPlayRef.current && audio.paused) {
          void audio.play().catch(() => { setIsLoading(false) })
        }
      }],
      ['ended', () => {
        setIsPlaying(false); setIsEnded(true)
        const v = currentVideoDataRef.current
        if (v?.type === 'SERMON') clearSermonResume(v.id)
      }],
      ['error', () => {
        if (cacheWatchdogRef.current) { clearTimeout(cacheWatchdogRef.current); cacheWatchdogRef.current = null }
        // 손상 처리 중 떼어낸 src로 인한 후속 error는 무시(재다운로드 흐름 유지).
        if (corruptHandlingRef.current) { setIsLoading(false); return }
        const localPlayback = localPlaybackRef.current
        const activeVideo = currentVideoDataRef.current
        if (localPlayback && activeVideo?.id === localPlayback.id && !localFallbackInProgressRef.current) {
          const seekTo = positionRef.current
          const errorCode = audio.error?.code ?? null
          // 진짜 손상(MEDIA_ERR_DECODE=3)일 때만 파일 삭제한다. NETWORK(2)/
          // SRC_NOT_SUPPORTED(4)/ABORTED(1) 등 SW-라우팅 실패성 에러에선 파일을 보존하고
          // 이번 세션만 스트림으로 폴백한다. (데스크탑 Chrome 포함 전 플랫폼 적용:
          // 다운로드 직후 자동재생이 SW 경유 캐시재생에서 SRC_NOT_SUPPORTED로 실패하면
          // 멀쩡한 다운로드 파일이 즉시 삭제 → 새로고침마다 재다운로드되던 버그를 막는다.)
          const shouldDelete = errorCode === MediaError.MEDIA_ERR_DECODE
          setLastPlaybackError({
            code: errorCode,
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src || null,
            preservedFile: !shouldDelete,
          })
          localFallbackInProgressRef.current = true
          localPlaybackRef.current = null
          audio.pause()
          audio.src = ''
          const cleanup = shouldDelete
            ? deleteMedia(localPlayback.id, localPlayback.type)
                .finally(() => useCachedMediaStore.getState().refresh())
            : Promise.resolve()
          if (!shouldDelete) {
            // 파일 보존 시: 재생→swUrl→재에러 무한루프를 막기 위해 이번 세션 스킵 등록.
            _forceStreamThisSession.add(`${localPlayback.id}-${localPlayback.type}`)
          }
          void cleanup.finally(() => {
            setError(null)
            void playVideoRef.current?.(activeVideo, {
              autoPlay: true,
              skipRecentAdd: true,
              seekTo,
            }).finally(() => { localFallbackInProgressRef.current = false })
          })
          return
        }
        setError('재생 오류가 발생했습니다.')
        setIsLoading(false)
      }],
    ]

    const handlers = makeHandlers(audio)
    handlers.forEach(([event, handler]) => audio.addEventListener(event, handler))

    return () => {
      handlers.forEach(([event, handler]) => audio.removeEventListener(event, handler))
      audio.pause(); audio.src = ''
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    }
  }, [applyPendingSeek, syncPosition, updateActualDuration, updatePositionState])

  const playVideo = useCallback(async (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean; seekTo?: number }) => {
    // 비공개 영상: 모든 미디어 요청 차단 + 현재 재생 중인 미디어를 즉시 멈춘다.
    // (early-return만 하면 이전 곡 오디오가 계속 재생되고, currentVideo가 이전 곡으로
    //  남아 그 곡 다운로드 완료 시 재생되는 버그가 생긴다.)
    if (video.isSecret) {
      cancelAutoNext()
      clearCacheWatchdog()
      pendingCorruptReplayRef.current = null
      corruptHandlingRef.current = false
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
      if (reactPlayerRef.current) { reactPlayerRef.current.pause(); reactPlayerRef.current.src = '' }
      clearMediaSessionMetadata()
      setVideoUrl(null)
      localPlaybackRef.current = null
      pendingAutoPlayRef.current = false
      pendingSeekRef.current = null
      currentVideoDataRef.current = video
      currentVideoIdRef.current = video.id
      setCurrentVideo(video)
      setIsPlaying(false)
      setIsLoading(false)
      setIsEnded(false)
      hasAuthoritativeDurationRef.current = false
      positionRef.current = 0
      setPosition(0)
      setDuration(0)
      setError(null)
      return
    }

    const autoPlay = options?.autoPlay ?? true
    const isVideoMode = mediaModeRef.current === 'video'

    cancelAutoNext()
    // 새 재생 요청 → 이전 손상 감시 타이머/대기 중인 손상 재생 해제(스테일 방지)
    clearCacheWatchdog()
    pendingCorruptReplayRef.current = null
    corruptHandlingRef.current = false
    currentVideoDataRef.current = video
    setCurrentVideo(video)
    updateMediaSessionMetadata(video)
    currentVideoIdRef.current = video.id
    if (!options?.skipRecentAdd) useRecentStore.getState().add({
      id: video.id,
      youtubeId: video.youtubeId ?? null,
      title: video.title,
      thumbnail: video.thumbnail,
      tag: video.tag,
      type: video.type ?? null,
      hymnTitle: video.hymnTitle ?? null,
      duration: video.duration ?? null,
      chapter: video.chapter ?? null,
      isLive: video.isLive ?? null,
    })
    setIsLoading(true)
    setError(null)
    setIsEnded(false)
    // 곡 전환 시 옛 미디어를 즉시 멈춘다. 안 그러면 아래 async(getCachedMediaPlaybackUrl 등)
    // 동안 옛 트랙의 timeupdate가 계속 발화해 positionRef를 옛 위치로 되돌리고, 새 트랙의
    // 빠른 재다운로드 재생(seekTo: positionRef.current)이 옛 위치로 점프하는 버그가 생긴다.
    audioRef.current?.pause()
    reactPlayerRef.current?.pause()
    positionRef.current = 0
    pendingSeekRef.current = null
    setPosition(0)
    const dbDuration = normalizeDbDuration(video.duration)
    hasAuthoritativeDurationRef.current = dbDuration != null
    setDuration(dbDuration ?? 0)

    const mediaType = isVideoMode ? 'video' : 'audio'
    const cacheKey = `${video.id}-${mediaType}`
    if (isOpfsSupported() && !_forceStreamThisSession.has(cacheKey)) {
      try {
        const localUrl = await getCachedMediaPlaybackUrl(video.id, mediaType)
        if (localUrl) {
          if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
          if (localUrl.startsWith('blob:')) blobUrlRef.current = localUrl
          localPlaybackRef.current = { id: video.id, type: mediaType }
          setLastPlayback({ id: video.id, type: mediaType, source: localUrl.startsWith('blob:') ? 'blob' : 'sw', src: localUrl })
          if (isVideoMode) {
            pendingAutoPlayRef.current = autoPlay
            if (options?.seekTo != null) pendingSeekRef.current = options.seekTo
            setVideoUrl(localUrl)
            // 저장 파일 재생: 3초 무진행 시 손상 판정 watchdog (자동재생일 때만).
            if (autoPlay) armCacheWatchdog(video.id, mediaType)
            if (!autoPlay) setIsLoading(false)
          } else {
            setVideoUrl(null)
            const audio = audioRef.current
            if (!audio) return
            audio.src = localUrl
            audio.volume = volume
            applyPlaybackRate(audio)
            pendingAutoPlayRef.current = autoPlay
            if (options?.seekTo != null) pendingSeekRef.current = options.seekTo
            if (!autoPlay) {
              audio.load()
              setIsLoading(false)
              return
            }
            // 저장 파일 재생: 3초 무진행 시 손상 판정 watchdog.
            armCacheWatchdog(video.id, mediaType)
            try {
              await audio.play()
            } catch (e) {
              setIsLoading(false)
              // 자동재생 차단(NotAllowedError)은 손상이 아니므로 watchdog 해제(오삭제 방지).
              if (
                (e as DOMException)?.name === 'NotAllowedError' &&
                localPlaybackRef.current?.id === video.id &&
                localPlaybackRef.current?.type === mediaType
              ) {
                clearCacheWatchdog()
              }
            }
          }
          return
        }
      } catch {}
    }

    if (isVideoMode) {
      try {
        const { data } = await api.get<{ url: string; bitrate: number; encoding?: string; duration?: number | null }>(
          `/videos/${video.id}/stream`,
        )
        const streamDuration = normalizeDbDuration(data.duration)
        if (streamDuration != null) {
          hasAuthoritativeDurationRef.current = true
          setDuration(streamDuration)
        }
        setLastPlayback({ id: video.id, type: mediaType, source: 'stream', src: data.url })
        localPlaybackRef.current = null
        pendingAutoPlayRef.current = autoPlay
        if (video.type !== 'SERMON' && options?.seekTo != null) pendingSeekRef.current = options.seekTo
        setVideoUrl(data.url)
        if (!autoPlay) setIsLoading(false)
      } catch {
        setError('스트림을 불러올 수 없습니다.')
        setIsLoading(false)
      }
      return
    }

    // 오디오 모드. 여기 도달 = 위 캐시 히트 블록의 미스(미저장/미지원/force-stream) → 스트림 직행.
    // 스트림 URL은 Invidious/CDN이 직접 반환하고 <audio>가 그 URL로 바로 재생한다(백엔드 미경유).
    try {
      const { data } = await api.get<{ url: string; bitrate: number; encoding?: string; duration?: number | null }>(
        `/audios/${video.id}/stream`,
        { params: { quality: qualityRef.current } },
      )
      // 네트워크 대기 중 트랙이 바뀌었으면(다른 곡 재생/정지) 이 결과는 폐기한다.
      if (currentVideoIdRef.current !== video.id) return

      const streamDurationVal = normalizeDbDuration(data.duration)
      if (streamDurationVal != null) {
        hasAuthoritativeDurationRef.current = true
        setDuration(streamDurationVal)
      }
      setLastPlayback({ id: video.id, type: 'audio', source: 'stream', src: data.url })
      localPlaybackRef.current = null
      setVideoUrl(null)
      const audio = audioRef.current
      if (!audio) return
      audio.src = data.url
      audio.volume = volume
      applyPlaybackRate(audio)
      pendingAutoPlayRef.current = autoPlay
      if (video.type !== 'SERMON' && options?.seekTo != null) pendingSeekRef.current = options.seekTo
      if (!autoPlay) {
        audio.load()
        setIsLoading(false)
        return
      }
      try {
        // Android Chrome/iOS WebKit 모두 동적 src 교체 후 명시적 load가 없으면
        // play promise가 pending인 채 백그라운드 복귀 때까지 멈추는 사례가 있다.
        audio.load()
        await audio.play()
      } catch {
        setIsLoading(false)
      }
    } catch {
      setError('스트림을 불러올 수 없습니다.')
      setIsLoading(false)
    }
  }, [cancelAutoNext, volume, applyPlaybackRate, armCacheWatchdog, clearCacheWatchdog])

  useEffect(() => {
    playVideoRef.current = playVideo
  }, [playVideo])

  useEffect(() => {
    const handleMediaDownloaded = (event: Event) => {
      const detail = (event as CustomEvent<MediaDownloadedDetail>).detail
      const activeVideo = currentVideoDataRef.current
      if (!detail || !activeVideo) return
      const corrupt = pendingCorruptReplayRef.current
      const isCorruptReplay = !!corrupt && corrupt.id === detail.id && corrupt.type === detail.type
      // SERMON 자동 이어재생 외에, 손상→재다운로드 복구 시에도(찬송 포함) 재생을 재개한다.
      if (activeVideo.type !== 'SERMON' && !isCorruptReplay) return
      if (activeVideo.id !== detail.id) return

      const activeMediaType = mediaModeRef.current === 'video' ? 'video' : 'audio'
      if (detail.type !== activeMediaType) return

      if (isCorruptReplay) pendingCorruptReplayRef.current = null
      void playVideo(activeVideo, {
        autoPlay: isCorruptReplay ? true : isPlayingRef.current,
        skipRecentAdd: true,
        seekTo: positionRef.current,
      })
    }

    window.addEventListener(MEDIA_DOWNLOADED_EVENT, handleMediaDownloaded)
    return () => window.removeEventListener(MEDIA_DOWNLOADED_EVENT, handleMediaDownloaded)
  }, [playVideo])

  const stop = useCallback(() => {
    cancelAutoNext()
    clearCacheWatchdog()
    pendingCorruptReplayRef.current = null
    corruptHandlingRef.current = false
    pendingAutoPlayRef.current = false
    if (mediaModeRef.current === 'video') {
      const video = reactPlayerRef.current
      if (video) { video.pause(); video.src = ''; video.load() }
      setVideoUrl(null)
    } else {
      const audio = audioRef.current
      if (audio) { audio.pause(); audio.src = '' }
    }
    localPlaybackRef.current = null
    localFallbackInProgressRef.current = false
    setCurrentVideo(null)
    currentVideoDataRef.current = null
    clearMediaSessionMetadata()
    currentVideoIdRef.current = null
    hasAuthoritativeDurationRef.current = false
    setIsPlaying(false)
    setIsLoading(false)
    setIsEnded(false)
    positionRef.current = 0
    setPosition(0)
    setDuration(0)
    setError(null)
  }, [cancelAutoNext, clearCacheWatchdog])

  const togglePlay = useCallback(() => {
    if (mediaModeRef.current === 'video') {
      const video = reactPlayerRef.current
      if (!video) return
      if (video.paused || video.ended) video.play().catch(() => {})
      else video.pause()
    } else {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) audio.play()
      else audio.pause()
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    // 설교 스트림은 즉시 재생만 허용한다. 다운로드 완료 후 로컬 파일로 전환되면 구간 이동 허용.
    if (currentVideoDataRef.current?.type === 'SERMON' && !localPlaybackRef.current) return
    const video = reactPlayerRef.current
    if (mediaModeRef.current === 'video' && video) {
      applySeek(video, seconds)
      if (video.paused && isPlayingRef.current) {
        video.play().catch(() => {})
      }
    } else {
      const audio = audioRef.current
      if (!audio) return
      applySeek(audio, seconds)
    }
  }, [applySeek])

  const seekBy = useCallback((delta: number) => {
    if (currentVideoDataRef.current?.type === 'SERMON' && !localPlaybackRef.current) return
    const video = reactPlayerRef.current
    if (mediaModeRef.current === 'video' && video) {
      applySeek(video, positionRef.current + delta)
      if (video.paused && isPlayingRef.current) {
        video.play().catch(() => {})
      }
    } else {
      const audio = audioRef.current
      if (!audio) return
      applySeek(audio, audio.currentTime + delta)
    }
  }, [applySeek])

  const seekFraction = useCallback((fraction: number) => {
    const media = mediaModeRef.current === 'video' ? reactPlayerRef.current : audioRef.current
    if (!media) return
    const knownDuration = getKnownDuration(media.duration)
    if (!knownDuration) return
    seek(fraction * knownDuration)
  }, [seek, getKnownDuration])

  const handleSetVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v
    if (reactPlayerRef.current) reactPlayerRef.current.volume = v
    setVolume(v)
  }, [])

  // 잠금화면/알림센터 미디어 컨트롤(OS Media Session) 핸들러 등록.
  // 이게 없으면 iOS/Android 잠금화면의 ▶️⏸️⏪⏩ 버튼이 no-op이라, 백그라운드에서
  // 재생이 멈췄을 때(예: iOS가 백그라운드 pause 발화) 잠금화면에서 다시 재생할 방법이 없다.
  // 핸들러를 등록해두면 OS가 미디어 세션을 더 오래 유지하고, 사용자가 잠금화면에서
  // 재생/일시정지/구간이동을 직접 제어할 수 있다.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, handler) } catch { /* 미지원 액션 무시 */ }
    }
    const currentMedia = () => (mediaModeRef.current === 'video' ? reactPlayerRef.current : audioRef.current)
    set('play', () => {
      currentMedia()?.play().catch(() => {})
    })
    set('pause', () => { currentMedia()?.pause() })
    set('seekbackward', (d) => seekBy(-(d.seekOffset || 15)))
    set('seekforward', (d) => seekBy(d.seekOffset || 15))
    set('seekto', (d) => { if (typeof d.seekTime === 'number') seek(d.seekTime) })
    return () => {
      ;(['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[])
        .forEach((a) => set(a, null))
    }
  }, [seek, seekBy])

  const onVideoPlay = useCallback(() => {
    setIsPlaying(true)
    setIsLoading(false)
  }, [])

  const onVideoPause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const onVideoWaiting = useCallback(() => setIsLoading(true), [])

  const onVideoCanPlay = useCallback(() => {
    setIsLoading(false)
    const video = reactPlayerRef.current
    if (video) {
      video.volume = volume
      applyPlaybackRate(video)
      applyPendingSeek(video)
    }
    if (pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false
      video?.play().catch((e) => {
        setIsLoading(false)
        // 자동재생 차단(NotAllowedError)은 손상이 아니므로 watchdog 해제(오삭제 방지).
        if ((e as DOMException)?.name === 'NotAllowedError' && localPlaybackRef.current) clearCacheWatchdog()
      })
    }
  }, [applyPendingSeek, volume, applyPlaybackRate, clearCacheWatchdog])

  const onVideoTimeUpdate = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    syncPosition(e.currentTarget)
  }, [syncPosition])

  const onVideoLoadedMetadata = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    updateActualDuration(e.currentTarget.duration)
    applyPendingSeek(e.currentTarget)
  }, [applyPendingSeek, updateActualDuration])

  const onVideoDurationChange = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    updateActualDuration(e.currentTarget.duration)
    applyPendingSeek(e.currentTarget)
  }, [applyPendingSeek, updateActualDuration])

  const onVideoEnded = useCallback(() => {
    setIsPlaying(false)
    setIsEnded(true)
    const v = currentVideoDataRef.current
    if (v?.type === 'SERMON') clearSermonResume(v.id)
  }, [])

  const onVideoError = useCallback(() => {
    if (cacheWatchdogRef.current) { clearTimeout(cacheWatchdogRef.current); cacheWatchdogRef.current = null }
    if (corruptHandlingRef.current) { setIsLoading(false); return }
    const localPlayback = localPlaybackRef.current
    const activeVideo = currentVideoDataRef.current
    const video = reactPlayerRef.current
    if (localPlayback && activeVideo?.id === localPlayback.id && !localFallbackInProgressRef.current) {
      const seekTo = positionRef.current
      const errorCode = video?.error?.code ?? null
      // audio 핸들러와 동일한 안전 픽스: 진짜 손상(MEDIA_ERR_DECODE=3)일 때만 삭제.
      // 그 외(NETWORK/SRC_NOT_SUPPORTED 등 라우팅 실패)는 전 플랫폼에서 파일 보존.
      const shouldDelete = errorCode === MediaError.MEDIA_ERR_DECODE
      setLastPlaybackError({
        code: errorCode,
        networkState: video?.networkState ?? null,
        readyState: video?.readyState ?? null,
        src: video?.src || null,
        preservedFile: !shouldDelete,
      })
      localFallbackInProgressRef.current = true
      localPlaybackRef.current = null
      if (video) { video.pause(); video.src = ''; video.load() }
      const cleanup = shouldDelete
        ? deleteMedia(localPlayback.id, localPlayback.type)
            .finally(() => useCachedMediaStore.getState().refresh())
        : Promise.resolve()
      if (!shouldDelete) {
        _forceStreamThisSession.add(`${localPlayback.id}-${localPlayback.type}`)
      }
      void cleanup.finally(() => {
        setError(null)
        void playVideoRef.current?.(activeVideo, {
          autoPlay: true,
          skipRecentAdd: true,
          seekTo,
        }).finally(() => { localFallbackInProgressRef.current = false })
      })
      return
    }
    setError('비디오 재생 오류가 발생했습니다.')
    setIsLoading(false)
  }, [])

  const restartCurrentMedia = useCallback(() => {
    const video = reactPlayerRef.current
    if (mediaModeRef.current === 'video' && video) {
      applySeek(video, 0)
      video.play().catch(() => {})
      return
    }
    const audio = audioRef.current
    if (!audio) return
    applySeek(audio, 0)
    audio.play().catch(() => {})
  }, [applySeek])

  const playQueuedVideo = useCallback(async (targetId: string, targetIndex: number) => {
    // 같은 곡이면 백엔드 요청 없이 처음부터 재생
    if (targetId === currentVideoIdRef.current) {
      setIsEnded(false)
      positionRef.current = 0
      pendingSeekRef.current = null
      setPosition(0)
      setQueue(queueIds, targetIndex)
      restartCurrentMedia()
      return
    }
    try {
      // 1) 동기 reset 먼저 (isEnded=false를 보장)
      setIsEnded(false)
      positionRef.current = 0
      pendingSeekRef.current = null
      setPosition(0)
      setIsLoading(true)

      // 2) async 작업
      const targetMeta = useQueueStore.getState().videos[targetIndex]
      const { data } = await api.get<VideoDetail>(`/videos/${targetId}`)

      // 비공개 영상은 자동재생 스킵 (무한루프 방지: 그냥 멈춤)
      if (data.isSecret || isLiveVideo(targetMeta?.isLive ?? data.isLive)) {
        setIsLoading(false)
        setIsEnded(false)
        return
      }

      const dbDuration = normalizeDbDuration(data.duration)
      hasAuthoritativeDurationRef.current = dbDuration != null
      setDuration(dbDuration ?? 0)

      // 3) setQueue 및 playVideo (이미 isEnded=false가 committed)
      setQueue(queueIds, targetIndex)
      await playVideo({
        id: data.id,
        youtubeId: targetMeta?.youtubeId ?? data.youtubeId ?? null,
        title: data.title,
        thumbnail: data.thumbnail,
        tag: data.tag,
        type: targetMeta?.type ?? data.type ?? null,
        hymnTitle: targetMeta?.hymnTitle ?? data.lyric?.hymnTitle ?? data.hymnTitle,
        duration: data.duration ?? targetMeta?.duration ?? null,
        chapter: data.chapter ?? targetMeta?.chapter ?? null,
        playerPath: targetMeta?.playerPath ?? data.playerPath ?? undefined,
        isLive: targetMeta?.isLive ?? data.isLive ?? null,
        categoryId: targetMeta?.categoryId ?? undefined,
        categoryTitle: targetMeta?.categoryTitle ?? undefined,
      }, { autoPlay: true })
    } catch {
      setError('다음 곡을 불러올 수 없습니다.')
    }
  }, [playVideo, queueIds, restartCurrentMedia, setQueue])

  useEffect(() => {
    if (!isEnded) {
      cancelAutoNext()
      return
    }
    if (autoNextDelay === 'off' || playMode === 'single') return

    let targetId: string | null = null
    let targetIndex = -1
    if (playMode === 'loop') {
      targetId = currentVideo?.id ?? null
      targetIndex = queueIndex
    } else if (queueIds.length) {
      const currentIndex = queueIndex >= 0 ? queueIndex : queueIds.indexOf(currentVideo?.id ?? '')
      const nextIndex = currentIndex + 1
      if (nextIndex < queueIds.length) {
        targetIndex = nextIndex
        targetId = queueIds[nextIndex]
      } else if (playMode === 'repeat') {
        targetIndex = 0
        targetId = queueIds[0]
      }
    }
    if (!targetId) return

    const advance = () => {
      cancelAutoNext()
      if (playMode === 'loop') {
        restartCurrentMedia()
      } else {
        void playQueuedVideo(targetId, targetIndex)
      }
    }

    if (autoNextDelay === 'immediate') {
      advance()
      return
    }

    const delayMs = autoNextDelay === '3s' ? 3000 : 5000
    const steps = 100
    const intervalMs = delayMs / steps
    let step = 0
    setAutoNextProgress(0)
    autoNextTimerRef.current = setInterval(() => {
      step += 1
      setAutoNextProgress(step / steps)
      if (step >= steps) advance()
    }, intervalMs)

    return cancelAutoNext
  }, [
    autoNextDelay,
    cancelAutoNext,
    currentVideo?.id,
    isEnded,
    playMode,
    playQueuedVideo,
    queueIds,
    queueIndex,
    restartCurrentMedia,
  ])

  // position은 의도적으로 deps/객체에서 제외한다 — position만 바뀌는 렌더에서 value가 재사용돼야
  // AudioCtx 소비자(13개 컴포넌트)가 초당 수회 리렌더되지 않는다. position은 별도 PositionCtx로 공급.
  const value = useMemo<AudioContextValue>(() => ({
    currentVideo, isPlaying, isLoading, isEnded, duration: effectiveDuration, autoNextProgress, error, volume,
    videoUrl, reactPlayerRef, videoSlotRef,
    playVideo, stop, togglePlay, seek, seekBy, seekFraction, cancelAutoNext, setVolume: handleSetVolume,
    onVideoPlay, onVideoPause, onVideoWaiting, onVideoCanPlay,
    onVideoTimeUpdate, onVideoLoadedMetadata, onVideoDurationChange, onVideoEnded, onVideoError,
  }), [
    currentVideo, isPlaying, isLoading, isEnded, effectiveDuration, autoNextProgress, error, volume, videoUrl,
    reactPlayerRef, videoSlotRef,
    playVideo, stop, togglePlay, seek, seekBy, seekFraction, cancelAutoNext, handleSetVolume,
    onVideoPlay, onVideoPause, onVideoWaiting, onVideoCanPlay,
    onVideoTimeUpdate, onVideoLoadedMetadata, onVideoDurationChange, onVideoEnded, onVideoError,
  ])

  return (
    <AudioCtx.Provider value={value}>
      <PositionCtx.Provider value={position}>
        {/* 모바일 브라우저는 DOM에 붙지 않은 new Audio()의 초기 네트워크 로드/자동재생을
            보류할 수 있다. 비디오와 동일하게 실제 DOM 미디어 엘리먼트를 계속 유지한다. */}
        <audio
          ref={audioRef}
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'fixed',
            left: -9999,
            top: 0,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
        {children}
      </PositionCtx.Provider>
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}

export function usePosition() {
  return useContext(PositionCtx)
}
