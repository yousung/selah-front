import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode, RefObject, SyntheticEvent } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useRecentStore } from '@/store/recentStore'
import { api } from '@/lib/api'

interface VideoInfo {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
}

interface AudioContextValue {
  currentVideo: VideoInfo | null
  isPlaying: boolean
  isLoading: boolean
  isEnded: boolean
  position: number
  duration: number
  error: string | null
  volume: number
  videoUrl: string | null
  reactPlayerRef: RefObject<HTMLVideoElement | null>
  playVideo: (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean }) => Promise<void>
  stop: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  seekBy: (delta: number) => void
  setVolume: (v: number) => void
  onVideoReady: () => void
  onVideoWaiting: () => void
  onVideoCanPlay: () => void
  onVideoTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => void
  onVideoLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => void
  onVideoEnded: () => void
  onVideoError: () => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reactPlayerRef = useRef<HTMLVideoElement | null>(null)
  const quality = useSettingsStore((s) => s.quality)
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [position, setPosition] = useState(0)
  const positionRef = useRef(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(1)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const isPlayingRef = useRef(false)
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const qualityRef = useRef(quality)
  useEffect(() => { qualityRef.current = quality }, [quality])
  const mediaModeRef = useRef(mediaMode)
  useEffect(() => { mediaModeRef.current = mediaMode }, [mediaMode])

  useEffect(() => {
    if (reactPlayerRef.current) reactPlayerRef.current.volume = volume
  }, [volume])
  const isMountedRef = useRef(false)
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    setVideoUrl(null)
    setCurrentVideo(null)
    setIsPlaying(false)
    setIsLoading(false)
    setIsEnded(false)
    positionRef.current = 0
    setPosition(0)
    setDuration(0)
    setError(null)
  }, [mediaMode])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const handlers: [string, EventListener][] = [
      ['loadedmetadata', () => setDuration(audio.duration)],
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
  }, [])

  const playVideo = useCallback(async (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean }) => {
    const autoPlay = options?.autoPlay ?? true
    const isVideoMode = mediaModeRef.current === 'video'

    setCurrentVideo(video)
    if (!options?.skipRecentAdd) useRecentStore.getState().add(video)
    setIsLoading(true)
    setError(null)
    setIsEnded(false)
    positionRef.current = 0
    setPosition(0)
    setDuration(0)

    try {
      const streamPath = isVideoMode ? `/videos/${video.id}/stream` : `/audios/${video.id}/stream`
      const { data } = await api.get<{ url: string; bitrate: number; encoding?: string }>(
        streamPath,
        { params: { quality: qualityRef.current } },
      )
      if (isVideoMode) {
        setVideoUrl(data.url)
        setIsPlaying(autoPlay)
        if (!autoPlay) setIsLoading(false)
        if (reactPlayerRef.current) {
          reactPlayerRef.current.muted = false
          reactPlayerRef.current.volume = volume
        }
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
  }, [volume])

  const stop = useCallback(() => {
    if (mediaModeRef.current === 'video') {
      setVideoUrl(null)
    } else {
      const audio = audioRef.current
      if (audio) { audio.pause(); audio.src = '' }
    }
    setCurrentVideo(null)
    setIsPlaying(false)
    setIsLoading(false)
    setIsEnded(false)
    positionRef.current = 0
    setPosition(0)
    setDuration(0)
    setError(null)
  }, [])

  const togglePlay = useCallback(() => {
    if (mediaModeRef.current === 'video') {
      setIsPlaying(p => !p)
    } else {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) audio.play()
      else audio.pause()
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    if (mediaModeRef.current === 'video') {
      const clamped = Math.max(0, seconds)
      if (reactPlayerRef.current) reactPlayerRef.current.currentTime = clamped
      positionRef.current = clamped
      setPosition(clamped)
      setIsEnded(false)
    } else {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0))
      setIsEnded(false)
    }
  }, [])

  const seekBy = useCallback((delta: number) => {
    if (mediaModeRef.current === 'video') {
      const newPos = Math.max(0, positionRef.current + delta)
      if (reactPlayerRef.current) reactPlayerRef.current.currentTime = newPos
      positionRef.current = newPos
      setPosition(newPos)
    } else {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0))
    }
  }, [])

  const handleSetVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v
    setVolume(v)
  }, [])

  const onVideoReady = useCallback(() => {
    setIsLoading(false)
    if (reactPlayerRef.current) {
      reactPlayerRef.current.muted = false
      reactPlayerRef.current.volume = volume
    }
  }, [volume])
  const onVideoWaiting = useCallback(() => setIsLoading(true), [])
  const onVideoCanPlay = useCallback(() => {
    setIsLoading(false)
    if (reactPlayerRef.current) {
      reactPlayerRef.current.muted = false
      reactPlayerRef.current.volume = volume
    }
  }, [volume])
  const onVideoTimeUpdate = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime
    positionRef.current = t
    setPosition(t)
  }, [])
  const onVideoLoadedMetadata = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration)
  }, [])
  const onVideoEnded = useCallback(() => { setIsPlaying(false); setIsEnded(true) }, [])
  const onVideoError = useCallback(() => { setError('비디오 재생 오류가 발생했습니다.'); setIsLoading(false) }, [])

  return (
    <AudioCtx.Provider value={{
      currentVideo, isPlaying, isLoading, isEnded, position, duration, error, volume,
      videoUrl, reactPlayerRef,
      playVideo, stop, togglePlay, seek, seekBy, setVolume: handleSetVolume,
      onVideoReady, onVideoWaiting, onVideoCanPlay,
      onVideoTimeUpdate, onVideoLoadedMetadata, onVideoEnded, onVideoError,
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
