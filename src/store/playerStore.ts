import { create } from 'zustand'

export interface VideoItem {
  id: string
  youtubeId: string
  title: string
  thumbnail: string | null
  tag: string | null
  playlistId: string | null
}

interface PlayerState {
  currentVideo: VideoItem | null
  isPlaying: boolean
  position: number
  duration: number
  isLoading: boolean
  error: string | null
  volume: number
  setCurrentVideo: (video: VideoItem) => void
  setIsPlaying: (v: boolean) => void
  setPosition: (v: number) => void
  setDuration: (v: number) => void
  setIsLoading: (v: boolean) => void
  setError: (v: string | null) => void
  setVolume: (v: number) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentVideo: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  isLoading: false,
  error: null,
  volume: 1,
  setCurrentVideo: (video) => set({ currentVideo: video, position: 0, duration: 0, isLoading: true, error: null }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPosition: (v) => set({ position: v }),
  setDuration: (v) => set({ duration: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setError: (v) => set({ error: v }),
  setVolume: (v) => set({ volume: v }),
}))
