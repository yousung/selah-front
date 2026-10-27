import { create } from 'zustand'
import { storageInfo, isOfflineMediaSupported, isVideoOnlyCompanion } from '@/lib/mediaStore'

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
      // 비디오 저장의 짝으로만 있는 `-audio`는 오디오 모드 기준 "저장됨"이 아니다(저장하면 소유자만 추가).
      set({ cachedIds: new Set(info.entries.filter((e) => !isVideoOnlyCompanion(e)).map((e) => e.id)) })
    } catch {}
  },
}))
