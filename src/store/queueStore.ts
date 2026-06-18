import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface VideoMeta {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  hymnTitle?: string | null
  duration?: number | null
  chapter?: number | null
  playerPath?: string | null
}

interface QueueState {
  ids: string[]
  videos: VideoMeta[]
  index: number
  isOpen: boolean
  setQueue: (ids: string[], index: number, videos?: VideoMeta[]) => void
  clearQueue: () => void
  openQueue: () => void
  closeQueue: () => void
  toggleQueue: () => void
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      ids: [],
      videos: [],
      index: -1,
      isOpen: false,
      setQueue: (ids, index, videos) => set((prev) => ({
        ids,
        index,
        videos: videos !== undefined ? videos : prev.videos,
      })),
      clearQueue: () => set({ ids: [], videos: [], index: -1 }),
      openQueue: () => set({ isOpen: true }),
      closeQueue: () => set({ isOpen: false }),
      toggleQueue: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    { name: 'selah-queue' },
  ),
)
