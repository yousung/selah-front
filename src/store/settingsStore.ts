import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type AudioQuality = 'high' | 'medium' | 'low'
export type AutoNextDelay = 'immediate' | '3s' | '5s' | 'off'
export type PlayMode = 'single' | 'playlist' | 'repeat' | 'loop'
export type MediaMode = 'audio' | 'video'

interface SettingsState {
  theme: Theme
  quality: AudioQuality
  mediaMode: MediaMode
  autoPlayOnDetail: boolean
  autoNextDelay: AutoNextDelay
  playMode: PlayMode
  setTheme: (t: Theme) => void
  setQuality: (q: AudioQuality) => void
  setMediaMode: (m: MediaMode) => void
  setAutoPlayOnDetail: (enabled: boolean) => void
  setAutoNextDelay: (v: AutoNextDelay) => void
  setPlayMode: (v: PlayMode) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      quality: 'high',
      mediaMode: 'audio',
      autoPlayOnDetail: true,
      autoNextDelay: '3s',
      playMode: 'playlist',
      setTheme: (theme) => set({ theme }),
      setQuality: (quality) => set({ quality }),
      setMediaMode: (mediaMode) => set({ mediaMode }),
      setAutoPlayOnDetail: (autoPlayOnDetail) => set({ autoPlayOnDetail }),
      setAutoNextDelay: (autoNextDelay) => set({ autoNextDelay }),
      setPlayMode: (playMode) => set({ playMode }),
    }),
    {
      name: 'selah-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
