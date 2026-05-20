import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecentItem {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  playedAt: number
}

interface RecentState {
  items: RecentItem[]
  add: (video: Omit<RecentItem, 'playedAt'>) => void
  clear: () => void
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      add: (video) =>
        set((s) => {
          const filtered = s.items.filter((i) => i.id !== video.id)
          const next = [{ ...video, playedAt: Date.now() }, ...filtered]
          return { items: next.slice(0, 30) }
        }),
      clear: () => set({ items: [] }),
    }),
    { name: 'selah-recent' },
  ),
)
