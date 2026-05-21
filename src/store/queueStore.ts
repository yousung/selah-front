import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface QueueState {
  ids: string[]
  index: number
  setQueue: (ids: string[], index: number) => void
  clearQueue: () => void
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      ids: [],
      index: -1,
      setQueue: (ids, index) => set({ ids, index }),
      clearQueue: () => set({ ids: [], index: -1 }),
    }),
    { name: 'selah-queue' },
  ),
)
