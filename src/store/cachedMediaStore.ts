import { create } from 'zustand'
import { storageInfo, isOfflineMediaSupported } from '@/lib/mediaStore'

interface CachedMediaState {
  cachedIds: Set<string>
  refresh: () => Promise<void>
}

export const useCachedMediaStore = create<CachedMediaState>((set) => ({
  cachedIds: new Set(),
  refresh: async () => {
    if (!isOfflineMediaSupported()) return
    try {
      const info = await storageInfo()
      set({ cachedIds: new Set(info.entries.map((e) => e.id)) })
    } catch {}
  },
}))
