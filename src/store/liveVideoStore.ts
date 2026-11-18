import { create } from 'zustand'

/** 지금 열린 방송중(`isLive`) 영상. `LiveVideoOverlay`가 유튜브 공식 IFrame 플레이어로 띄운다. 저장 안 함. */
export interface LiveVideoTarget {
  youtubeId: string
  title?: string | null
}

interface LiveVideoState {
  live: LiveVideoTarget | null
  open: (target: LiveVideoTarget) => void
  close: () => void
}

export const useLiveVideoStore = create<LiveVideoState>()((set) => ({
  live: null,
  // 같은 방송을 다시 열면(두 번 탭) 플레이어를 새로 만들지 않는다.
  open: (live) => set((s) => (s.live?.youtubeId === live.youtubeId ? s : { live })),
  close: () => set({ live: null }),
}))
