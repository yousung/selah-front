import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { clearSermonResume } from '@/lib/sermonResume'

export type Theme = 'light' | 'dark'
export type AudioQuality = 'high' | 'medium' | 'low'
export type AutoNextDelay = 'immediate' | '3s' | '5s' | 'off'
export type PlayMode = 'single' | 'playlist' | 'repeat' | 'loop'
export type MediaMode = 'audio' | 'video'
export type OfflineStorageMode = 'thrift' | 'normal' | 'generous' | 'custom'
/** 비디오 모드 저장 화질 상한. 480p는 av01 전용이라(iOS 불가) 없다 — backend `getDownloadUrl` 참고 */
export type VideoDownloadQuality = '360p' | '720p'
export type FontScale = 1 | 1.5 | 2
export type Occupation = 'worker' | 'homemaker' | 'student' | 'pastor'

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  worker: '직장인',
  homemaker: '주부',
  student: '학생',
  pastor: '목사',
}

interface SettingsState {
  theme: Theme
  quality: AudioQuality
  mediaMode: MediaMode
  autoPlayOnDetail: boolean
  autoNextDelay: AutoNextDelay
  playMode: PlayMode
  playbackRate: number
  showCatechismHeadings: boolean
  showCatechismToc: boolean
  offlineStorageMode: OfflineStorageMode
  offlineStorageCustomMB: number
  videoDownloadQuality: VideoDownloadQuality
  fontScale: FontScale
  onlyOurChurch: boolean
  /** 지금의 기도 일과 기도 맞춤용 (null = 미설정 → 직장인으로 취급) */
  occupation: Occupation | null
  setTheme: (t: Theme) => void
  setQuality: (q: AudioQuality) => void
  setMediaMode: (m: MediaMode) => void
  setAutoPlayOnDetail: (enabled: boolean) => void
  setAutoNextDelay: (v: AutoNextDelay) => void
  setPlayMode: (v: PlayMode) => void
  setPlaybackRate: (v: number) => void
  setShowCatechismHeadings: (enabled: boolean) => void
  setShowCatechismToc: (enabled: boolean) => void
  setOfflineStorageMode: (m: OfflineStorageMode) => void
  setOfflineStorageCustomMB: (mb: number) => void
  setVideoDownloadQuality: (q: VideoDownloadQuality) => void
  setFontScale: (v: FontScale) => void
  setOnlyOurChurch: (enabled: boolean) => void
  setOccupation: (v: Occupation | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      quality: 'high',
      mediaMode: 'audio',
      autoPlayOnDetail: true,
      autoNextDelay: 'immediate',
      playMode: 'playlist',
      playbackRate: 1,
      showCatechismHeadings: true,
      showCatechismToc: true,
      offlineStorageMode: 'normal',
      offlineStorageCustomMB: 1024,
      videoDownloadQuality: '360p',
      fontScale: 1,
      onlyOurChurch: true,
      occupation: null,
      setTheme: (theme) => set({ theme }),
      setQuality: (quality) => set({ quality }),
      setMediaMode: (mediaMode) => set((s) => {
        // 오디오/비디오 모드 토글 시 이어듣기 저장소 무효화 (모드별 다운로드 완료 상태가 다름)
        if (s.mediaMode !== mediaMode) clearSermonResume()
        return { mediaMode }
      }),
      setAutoPlayOnDetail: (autoPlayOnDetail) => set({ autoPlayOnDetail }),
      setAutoNextDelay: (autoNextDelay) => set({ autoNextDelay }),
      setPlayMode: (playMode) => set({ playMode }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setShowCatechismHeadings: (showCatechismHeadings) => set({ showCatechismHeadings }),
      setShowCatechismToc: (showCatechismToc) => set({ showCatechismToc }),
      setOfflineStorageMode: (offlineStorageMode) => set({ offlineStorageMode }),
      setOfflineStorageCustomMB: (mb) => set({ offlineStorageCustomMB: Math.min(2048, Math.max(1, mb)) }),
      setVideoDownloadQuality: (videoDownloadQuality) => set({ videoDownloadQuality }),
      setFontScale: (fontScale) => set({ fontScale }),
      setOnlyOurChurch: (onlyOurChurch) => set({ onlyOurChurch }),
      setOccupation: (occupation) => set({ occupation }),
    }),
    {
      name: 'selah-settings',
      storage: createJSONStorage(() => localStorage),
      // v1: occupation 추가 — 기존 설정은 그대로 두고 occupation만 null로 채운다
      // v2: autoDownload 제거(자동 다운로드 폐지) — 옛 저장값은 버린다
      // videoDownloadQuality는 버전 올림 없이 추가: persist가 저장값을 기본값 위에 얕게 병합해 없으면 '360p'가 된다
      version: 2,
      migrate: (persisted) => {
        const { autoDownload: _removed, ...rest } = (persisted ?? {}) as Record<string, unknown>
        return { occupation: null, ...rest } as unknown as SettingsState
      },
    },
  ),
)
