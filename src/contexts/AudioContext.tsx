import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
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
  playVideo: (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean }) => Promise<void>
  stop: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  seekBy: (delta: number) => void
  setVolume: (v: number) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const quality = useSettingsStore((s) => s.quality)
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const handlers: [string, EventListener][] = [
      ['loadedmetadata', () => setDuration(audio.duration)],
      ['timeupdate', () => setPosition(audio.currentTime)],
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

  const qualityRef = useRef(quality)
  useEffect(() => { qualityRef.current = quality }, [quality])

  const playVideo = useCallback(async (video: VideoInfo, options?: { autoPlay?: boolean; skipRecentAdd?: boolean }) => {
    const audio = audioRef.current
    if (!audio) return
    const autoPlay = options?.autoPlay ?? true

    setCurrentVideo(video)
    if (!options?.skipRecentAdd) useRecentStore.getState().add(video)
    setIsLoading(true)
    setError(null)
    setIsEnded(false)
    setPosition(0)
    setDuration(0)

    try {
      const { data } = await api.get<{ url: string; bitrate: number; encoding?: string }>(
        `/videos/${video.id}/stream`,
        { params: { quality: qualityRef.current } },
      )
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
        setError(null)
      }
    } catch {
      setError('스트림을 불러올 수 없습니다.')
      setIsLoading(false)
    }
  }, [volume])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ''
    setCurrentVideo(null)
    setIsPlaying(false)
    setIsLoading(false)
    setIsEnded(false)
    setPosition(0)
    setDuration(0)
    setError(null)
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play()
    else audio.pause()
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0))
  }, [])

  const seekBy = useCallback((delta: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0))
  }, [])

  const handleSetVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v
    setVolume(v)
  }, [])

  return (
    <AudioCtx.Provider value={{
      currentVideo, isPlaying, isLoading, isEnded, position, duration, error, volume,
      playVideo, stop, togglePlay, seek, seekBy, setVolume: handleSetVolume,
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
