import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// 곡(video.id)별 볼륨 증폭 배율(수동). UI/저장값은 1~10(표시용)이지만, 실제 GainNode에는
// 이 값의 VOLUME_BOOST_GAIN_SCALE배(3배)가 실린다 — 즉 표시 "10배"가 실제 30배 증폭이다.
// 표시를 작게 유지하면서 실제 증폭 헤드룸을 크게 확보하기 위함. 다운로드/캐시(same-origin)
// 재생에만 적용된다. 오디오 모드에서만 사용(비디오 모드에서는 아이콘 자체가 숨겨진다).
//
// 저장소: localStorage 키 'selah-volume-boost'. 이 키는 SettingsPage의
// LOCAL_STORAGE_KEYS_TO_KEEP에 포함돼 "캐시 삭제"로도 지워지지 않는다(곡별 설정 보존).
export const VOLUME_BOOST_MIN = 1
export const VOLUME_BOOST_MAX = 10
// 표시값 → 실제 GainNode 배율 변환 계수. 실제 최대 = VOLUME_BOOST_MAX * VOLUME_BOOST_GAIN_SCALE(30배).
export const VOLUME_BOOST_GAIN_SCALE = 3

/** 표시 배율(1~10) → 실제로 GainNode에 실을 배율(3~30). */
export function displayBoostToGain(displayValue: number): number {
  return displayValue * VOLUME_BOOST_GAIN_SCALE
}

export const VOLUME_BOOST_STORAGE_KEY = 'selah-volume-boost'

interface VolumeBoostState {
  boosts: Record<string, number>
  getBoost: (videoId: string) => number
  setBoost: (videoId: string, v: number) => void
}

export const useVolumeBoostStore = create<VolumeBoostState>()(
  persist(
    (set, get) => ({
      boosts: {},
      getBoost: (videoId) => get().boosts[videoId] ?? VOLUME_BOOST_MIN,
      setBoost: (videoId, v) =>
        set((s) => {
          const clamped = Math.min(VOLUME_BOOST_MAX, Math.max(VOLUME_BOOST_MIN, v))
          const boosts = { ...s.boosts }
          // 보통(1)이면 맵에서 제거해 저장소를 비대해지지 않게 한다(기본값 = 보통).
          if (clamped <= VOLUME_BOOST_MIN) delete boosts[videoId]
          else boosts[videoId] = clamped
          return { boosts }
        }),
    }),
    {
      name: VOLUME_BOOST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
