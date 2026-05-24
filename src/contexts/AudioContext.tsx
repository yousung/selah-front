import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode, RefObject, SyntheticEvent } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useRecentStore } from '@/store/recentStore'
import { useDurationStore } from '@/store/durationStore'
import { useQueueStore } from '@/store/queueStore'
import { api } from '@/lib/api'

interface VideoInfo {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
}

interface VideoDetail {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
  lyric?: { hymnTitle?: string | null } | null
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
  playVideo: (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean }) => Promise<void>
  stop: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  seekBy: (delta: number) => void
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

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reactPlayerRef = useRef<HTMLVideoElement | null>(null)
  const videoSlotRef = useRef<HTMLDivElement | null>(null)
  const quality = useSettingsStore((s) => s.quality)
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const autoNextDelay = useSettingsStore((s) => s.autoNextDelay)
  const playMode = useSettingsStore((s) => s.playMode)
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
  const isPlayingRef = useRef(false)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  const pendingAutoPlayRef = useRef(false)
  const autoNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentVideoIdRef = useRef<string | null>(null)
  const durationRef = useRef(0)
  const pendingSeekRef = useRef<number | null>(null)
  useEffect(() => { durationRef.current = duration }, [duration])

  const updateActualDuration = useCallback((durationSeconds: number) => {
    const id = currentVideoIdRef.current
    if (!id || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return
    setDuration(durationSeconds)
    useDurationStore.getState().setDuration(id, durationSeconds)
  }, [])

  const getKnownDuration = useCallback((mediaDuration: number) => {
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration
    if (Number.isFinite(durationRef.current) && durationRef.current > 0) return durationRef.current
    return null
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
    cancelAutoNext()
    pendingAutoPlayRef.current = false
    pendingSeekRef.current = null
    setVideoUrl(null)
    setCurrentVideo(null)
    currentVideoIdRef.current = null
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
      ['timeupdate', () => { positionRef.current = audio.currentTime; setPosition(audio.currentTime) }],
      ['play', () => { setIsPlaying(true); setIsLoading(false) }],
      ['pause', () => setIsPlaying(false)],
      ['waiting', () => setIsLoading(true)],
      ['canplay', () => setIsLoading(false)],
      ['ended', () => { setIsPlaying(false); setIsEnded(true) }],
      ['error', () => { setError('재생 오류가 발생했습니다.'); setIsLoading(false) }],
    ]

    handlers.forEach(([event, handler]) => audio.addEventListener(event, handler))
    return () => {
      handlers.forEach(([event, handler]) => audio.removeEventListener(event, handler))
      audio.pause()
      audio.src = ''
    }
  }, [applyPendingSeek, updateActualDuration])

  const playVideo = useCallback(async (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean }) => {
    const autoPlay = options?.autoPlay ?? true
    const isVideoMode = mediaModeRef.current === 'video'

    cancelAutoNext()
    setCurrentVideo(video)
    currentVideoIdRef.current = video.id
    if (!options?.skipRecentAdd) useRecentStore.getState().add(video)
    setIsLoading(true)
    setError(null)
    setIsEnded(false)
    positionRef.current = 0
    pendingSeekRef.current = null
    setPosition(0)
    setDuration(useDurationStore.getState().byId[video.id] ?? 0)

    try {
      const streamPath = isVideoMode ? `/videos/${video.id}/stream` : `/audios/${video.id}/stream`
      const { data } = await api.get<{ url: string; bitrate: number; encoding?: string }>(
        streamPath,
        isVideoMode ? undefined : { params: { quality: qualityRef.current } },
      )
      if (isVideoMode) {
        pendingAutoPlayRef.current = autoPlay
        setVideoUrl(data.url)
        if (!autoPlay) setIsLoading(false)
      } else {
        setVideoUrl(null)
        const audio = audioRef.current
        if (!audio) return
        audio.src = data.url
        audio.volume = volume
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
  }, [cancelAutoNext, volume])

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
    setCurrentVideo(null)
    currentVideoIdRef.current = null
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
      applyPendingSeek(video)
    }
    if (pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false
      video?.play().catch(() => setIsLoading(false))
    }
  }, [applyPendingSeek, volume])

  const onVideoTimeUpdate = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime
    positionRef.current = t
    setPosition(t)
  }, [])

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

  const onVideoError = useCallback(() => { setError('비디오 재생 오류가 발생했습니다.'); setIsLoading(false) }, [])

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
      const { data } = await api.get<VideoDetail>(`/videos/${targetId}`)
      setDuration(useDurationStore.getState().byId[targetId] ?? 0)

      // 3) setQueue 및 playVideo (이미 isEnded=false가 committed)
      setQueue(queueIds, targetIndex)
      await playVideo({
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        tag: data.tag,
        hymnTitle: data.lyric?.hymnTitle ?? data.hymnTitle,
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
      currentVideo, isPlaying, isLoading, isEnded, position, duration, autoNextProgress, error, volume,
      videoUrl, reactPlayerRef, videoSlotRef,
      playVideo, stop, togglePlay, seek, seekBy, cancelAutoNext, setVolume: handleSetVolume,
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
