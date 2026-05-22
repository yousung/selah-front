import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DurationState {
  byId: Record<string, number>
  setDuration: (id: string, duration: number) => void
}

function normalizeDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return null
  return Math.round(duration)
}

export const useDurationStore = create<DurationState>()(
  persist(
    (set) => ({
      byId: {},
      setDuration: (id, duration) => {
        const normalized = normalizeDuration(duration)
        if (normalized == null) return
        set((state) => {
          if (state.byId[id] === normalized) return state
          return { byId: { ...state.byId, [id]: normalized } }
        })
      },
    }),
    { name: 'selah-durations' },
  ),
)
