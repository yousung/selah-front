import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type AudioQuality = 'high' | 'medium' | 'low'

interface SettingsState {
  theme: Theme
  quality: AudioQuality
  autoPlayOnDetail: boolean
  setTheme: (t: Theme) => void
  setQuality: (q: AudioQuality) => void
  setAutoPlayOnDetail: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      quality: 'high',
      autoPlayOnDetail: true,
      setTheme: (theme) => set({ theme }),
      setQuality: (quality) => set({ quality }),
      setAutoPlayOnDetail: (autoPlayOnDetail) => set({ autoPlayOnDetail }),
    }),
    {
      name: 'selah-settings',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
