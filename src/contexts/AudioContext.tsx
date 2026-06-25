import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode, RefObject, SyntheticEvent } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useRecentStore } from '@/store/recentStore'
import { useQueueStore } from '@/store/queueStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { api } from '@/lib/api'
import { deleteMedia, getCachedMediaPlaybackUrl, isOpfsSupported, MEDIA_DOWNLOADED_EVENT } from '@/lib/mediaStore'
import type { MediaDownloadedDetail } from '@/lib/mediaStore'
import { setLastPlayback, setLastPlaybackError } from '@/lib/mediaDiag'
import { thumbUrl, thumbQualityFor } from '@/lib/thumb'

interface VideoInfo {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  hymnTitle?: string | null
  duration?: number | null
  chapter?: number | null
  playerPath?: string
  isSecret?: boolean | null
}

interface VideoDetail {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  hymnTitle?: string | null
  chapter?: number | null
  duration?: number | null
  playerPath?: string | null
  lyric?: { hymnTitle?: string | null } | null
  isSecret?: boolean | null
}

interface AudioContextValue {
  currentVideo: VideoInfo | null
  isPlaying: boolean
  isLoading: boolean
  isEnded: boolean
  position: number
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

// 이번 세션 동안 로컬 재생을 건너뛰고 스트림으로만 가는 cacheKey(id-type) 집합.
// iOS에서 SW-라우팅 실패성 에러(NETWORK/SRC_NOT_SUPPORTED)에 파일을 보존한 채
// 폴백할 때, 재생→getCachedMediaPlaybackUrl→swUrl→다시 에러 무한루프를 막는다.
// (probe 0-0 206 성공이 전체 재생 성공을 보장하지 않기 때문.) reload 시 초기화.
const _forceStreamThisSession = new Set<string>()

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
}

function normalizeDbDuration(duration?: number | null) {
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : null
}

export function AudioProvider({ children }: { children: ReactNode }) {
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
  const [duration, setDuration] = useState(0)
  const [autoNextProgress, setAutoNextProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(1)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const currentVideoDataRef = useRef<VideoInfo | null>(null)
  const playVideoRef = useRef<AudioContextValue['playVideo'] | null>(null)
  const localPlaybackRef = useRef<{ id: string; type: 'audio' | 'video' } | null>(null)
  const localFallbackInProgressRef = useRef(false)
  const isPlayingRef = useRef(false)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { currentVideoDataRef.current = currentVideo }, [currentVideo])
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentVideo) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [currentVideo, isPlaying])
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

  const syncPosition = useCallback((media: HTMLMediaElement) => {
    const knownDuration = durationRef.current
    const currentTime = media.currentTime

    if (hasAuthoritativeDurationRef.current && knownDuration > 0 && currentTime >= knownDuration) {
      media.pause()
      positionRef.current = knownDuration
      setPosition(knownDuration)
      setIsPlaying(false)
      setIsEnded(true)
      return
    }

    positionRef.current = currentTime
    setPosition(currentTime)
  }, [])

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
      return true
    } catch {
      pendingSeekRef.current = target
      setIsEnded(false)
      return false
    }
  }, [getKnownDuration])

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

  const isMountedRef = useRef(false)
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return }
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
  }, [cancelAutoNext, mediaMode])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const handlers: [string, EventListener][] = [
      ['loadedmetadata', () => updateActualDuration(audio.duration)],
      ['durationchange', () => updateActualDuration(audio.duration)],
      ['loadedmetadata', () => applyPendingSeek(audio)],
      ['durationchange', () => applyPendingSeek(audio)],
      ['timeupdate', () => syncPosition(audio)],
      ['play', () => { setIsPlaying(true); setIsLoading(false) }],
      ['pause', () => setIsPlaying(false)],
      ['waiting', () => setIsLoading(true)],
      ['canplay', () => { applyPendingSeek(audio); setIsLoading(false) }],
      ['ended', () => { setIsPlaying(false); setIsEnded(true) }],
      ['error', () => {
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

    handlers.forEach(([event, handler]) => audio.addEventListener(event, handler))
    return () => {
      handlers.forEach(([event, handler]) => audio.removeEventListener(event, handler))
      audio.pause()
      audio.src = ''
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    }
  }, [applyPendingSeek, syncPosition, updateActualDuration])

  const playVideo = useCallback(async (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean; seekTo?: number }) => {
    // 비공개 영상은 캐시 조회·스트리밍·다운로드 등 모든 미디어 요청을 차단
    if (video.isSecret) {
      setIsLoading(false)
      return
    }

    const autoPlay = options?.autoPlay ?? true
    const isVideoMode = mediaModeRef.current === 'video'

    cancelAutoNext()
    currentVideoDataRef.current = video
    setCurrentVideo(video)
    updateMediaSessionMetadata(video)
    currentVideoIdRef.current = video.id
    if (!options?.skipRecentAdd) useRecentStore.getState().add({
      id: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      tag: video.tag,
      type: video.type ?? null,
      hymnTitle: video.hymnTitle ?? null,
      duration: video.duration ?? null,
      chapter: video.chapter ?? null,
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
            if (!autoPlay) setIsLoading(false)
          } else {
            setVideoUrl(null)
            const audio = audioRef.current
            if (!audio) return
            audio.src = localUrl
            audio.volume = volume
            applyPlaybackRate(audio)
            if (options?.seekTo != null) pendingSeekRef.current = options.seekTo
            if (!autoPlay) {
              audio.load()
              setIsLoading(false)
              return
            }
            try { await audio.play() } catch { setIsLoading(false) }
          }
          return
        }
      } catch {}
    }

    try {
      const streamPath = isVideoMode ? `/videos/${video.id}/stream` : `/audios/${video.id}/stream`
      const { data } = await api.get<{ url: string; bitrate: number; encoding?: string; duration?: number | null }>(
        streamPath,
        isVideoMode ? undefined : { params: { quality: qualityRef.current } },
      )
      const streamDuration = normalizeDbDuration(data.duration)
      if (streamDuration != null) {
        hasAuthoritativeDurationRef.current = true
        setDuration(streamDuration)
      }
      setLastPlayback({ id: video.id, type: mediaType, source: 'stream', src: data.url })
      if (isVideoMode) {
        localPlaybackRef.current = null
        pendingAutoPlayRef.current = autoPlay
        if (options?.seekTo != null) pendingSeekRef.current = options.seekTo
        setVideoUrl(data.url)
        if (!autoPlay) setIsLoading(false)
      } else {
        localPlaybackRef.current = null
        setVideoUrl(null)
        const audio = audioRef.current
        if (!audio) return
        audio.src = data.url
        audio.volume = volume
        applyPlaybackRate(audio)
        if (options?.seekTo != null) pendingSeekRef.current = options.seekTo
        if (!autoPlay) {
          audio.load()
          setIsLoading(false)
          return
        }
        try {
          await audio.play()
        } catch {
          setIsLoading(false)
        }
      }
    } catch {
      setError('스트림을 불러올 수 없습니다.')
      setIsLoading(false)
    }
  }, [cancelAutoNext, volume, applyPlaybackRate])

  useEffect(() => {
    playVideoRef.current = playVideo
  }, [playVideo])

  useEffect(() => {
    const handleMediaDownloaded = (event: Event) => {
      const detail = (event as CustomEvent<MediaDownloadedDetail>).detail
      const activeVideo = currentVideoDataRef.current
      if (!detail || !activeVideo) return
      if (activeVideo.type !== 'SERMON') return
      if (activeVideo.id !== detail.id) return

      const activeMediaType = mediaModeRef.current === 'video' ? 'video' : 'audio'
      if (detail.type !== activeMediaType) return

      void playVideo(activeVideo, {
        autoPlay: isPlayingRef.current,
        skipRecentAdd: true,
        seekTo: positionRef.current,
      })
    }

    window.addEventListener(MEDIA_DOWNLOADED_EVENT, handleMediaDownloaded)
    return () => window.removeEventListener(MEDIA_DOWNLOADED_EVENT, handleMediaDownloaded)
  }, [playVideo])

  const stop = useCallback(() => {
    cancelAutoNext()
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
  }, [cancelAutoNext])

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
      video?.play().catch(() => setIsLoading(false))
    }
  }, [applyPendingSeek, volume, applyPlaybackRate])

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
  }, [])

  const onVideoError = useCallback(() => {
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
      if (data.isSecret) {
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
        title: data.title,
        thumbnail: data.thumbnail,
        tag: data.tag,
        type: targetMeta?.type ?? data.type ?? null,
        hymnTitle: targetMeta?.hymnTitle ?? data.lyric?.hymnTitle ?? data.hymnTitle,
        duration: data.duration ?? targetMeta?.duration ?? null,
        chapter: data.chapter ?? targetMeta?.chapter ?? null,
        playerPath: targetMeta?.playerPath ?? data.playerPath ?? undefined,
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

  return (
    <AudioCtx.Provider value={{
      currentVideo, isPlaying, isLoading, isEnded, position, duration: effectiveDuration, autoNextProgress, error, volume,
      videoUrl, reactPlayerRef, videoSlotRef,
      playVideo, stop, togglePlay, seek, seekBy, seekFraction, cancelAutoNext, setVolume: handleSetVolume,
      onVideoPlay, onVideoPause, onVideoWaiting, onVideoCanPlay,
      onVideoTimeUpdate, onVideoLoadedMetadata, onVideoDurationChange, onVideoEnded, onVideoError,
    }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
