import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface VideoMeta {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  hymnTitle?: string | null
  duration?: number | null
  chapter?: number | null
}

interface QueueState {
  ids: string[]
  videos: VideoMeta[]
  index: number
  setQueue: (ids: string[], index: number, videos?: VideoMeta[]) => void
  clearQueue: () => void
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      ids: [],
      videos: [],
      index: -1,
      setQueue: (ids, index, videos) => set((prev) => ({
        ids,
        index,
        videos: videos !== undefined ? videos : prev.videos,
      })),
      clearQueue: () => set({ ids: [], videos: [], index: -1 }),
    }),
    { name: 'selah-queue' },
  ),
)
