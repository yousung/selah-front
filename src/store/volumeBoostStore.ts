import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * 곡(video.id)별 "소리 크게" 배율. 실제 증폭은 `lib/volumeBoost.ts`(Web Audio GainNode + 리미터)가 한다.
 * 값은 진폭 배수(1 = 원래). 1이면 맵에서 지운다(기본값).
 *
 * 저장소 키 `selah-volume-boost-v2` — 2.4.x의 `selah-volume-boost`(값 1~10, 내부 ×3 스케일)와
 * 의미가 달라 일부러 새 키를 쓴다. "캐시 삭제"로 지워지지 않게 SettingsPage 보존 목록에 들어 있다.
 */
export const VOLUME_BOOST_LEVELS = [1, 2, 5] as const
const MAX_BOOST = 5
export const VOLUME_BOOST_STORAGE_KEY = 'selah-volume-boost-v2'

interface VolumeBoostState {
  boosts: Record<string, number>
  setBoost: (videoId: string, level: number) => void
}

export const useVolumeBoostStore = create<VolumeBoostState>()(
  persist(
    (set) => ({
      boosts: {},
      setBoost: (videoId, level) =>
        set((s) => {
          const boosts = { ...s.boosts }
          if (!(level > 1)) delete boosts[videoId]
          else boosts[videoId] = Math.min(MAX_BOOST, level)
          return { boosts }
        }),
    }),
    {
      name: VOLUME_BOOST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // v0: 1.5/2배 단계 → v1: 2/5배 단계. 없어진 1.5는 2로 올린다(로컬 테스트 값만 해당, 미배포).
      version: 1,
      migrate: (persisted, version) => {
        const st = (persisted ?? {}) as { boosts?: Record<string, number> }
        const boosts: Record<string, number> = { ...(st.boosts ?? {}) }
        if (version < 1) for (const k of Object.keys(boosts)) if (boosts[k] > 1 && boosts[k] < 2) boosts[k] = 2
        return { ...st, boosts } as VolumeBoostState
      },
    },
  ),
)

/** 현재 저장된 배율(없으면 1). 렌더 밖(이벤트 핸들러)에서 쓴다. */
export function getVolumeBoost(videoId: string | null | undefined): number {
  if (!videoId) return 1
  return useVolumeBoostStore.getState().boosts[videoId] ?? 1
}
