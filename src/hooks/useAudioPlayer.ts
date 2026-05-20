import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { api } from '@/lib/api'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const store = usePlayerStore()

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'

    audio.addEventListener('loadedmetadata', () => store.setDuration(audio.duration))
    audio.addEventListener('timeupdate', () => store.setPosition(audio.currentTime))
    audio.addEventListener('play', () => { store.setIsPlaying(true); store.setIsLoading(false) })
    audio.addEventListener('pause', () => store.setIsPlaying(false))
    audio.addEventListener('waiting', () => store.setIsLoading(true))
    audio.addEventListener('canplay', () => store.setIsLoading(false))
    audio.addEventListener('ended', () => store.setIsPlaying(false))
    audio.addEventListener('error', () => {
      store.setError('재생 오류가 발생했습니다.')
      store.setIsLoading(false)
    })

    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const playVideo = useCallback(async (videoId: string, quality = 'medium') => {
    const audio = audioRef.current
    if (!audio) return

    store.setIsLoading(true)
    store.setError(null)

    try {
      const { data } = await api.get<{ url: string }>(`/videos/${videoId}/stream`, {
        params: { quality },
      })
      audio.src = data.url
      audio.volume = store.volume
      await audio.play()
    } catch {
      store.setError('스트림을 불러올 수 없습니다.')
      store.setIsLoading(false)
    }
  }, [store.volume])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0))
  }, [])

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current
    if (audio) audio.volume = v
    store.setVolume(v)
  }, [])

  return { audioRef, playVideo, togglePlay, seek, setVolume }
}
