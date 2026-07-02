import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { clearSermonResume } from '@/lib/sermonResume'

export type Theme = 'light' | 'dark'
export type AudioQuality = 'high' | 'medium' | 'low'
export type AutoNextDelay = 'immediate' | '3s' | '5s' | 'off'
export type PlayMode = 'single' | 'playlist' | 'repeat' | 'loop'
export type MediaMode = 'audio' | 'video'
export type OfflineStorageMode = 'thrift' | 'normal' | 'generous' | 'custom'
export type FontScale = 1 | 1.5 | 2
// 0=꺼짐, 1=1단계(약함), 2=2단계(강함, 저음 목소리가 잘릴 수 있음)
export type NoiseFilterLevel = 0 | 1 | 2

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
  autoDownload: boolean
  fontScale: FontScale
  // 노이즈 필터(Web Audio 증폭 경로에 highpass + RNNoise/NoiseGate). 전역 3단계(꺼짐/1/2). 기본 꺼짐.
  // 오디오 모드 + 다운로드(저장)된 곡에만 적용된다(비디오 모드에서는 동작하지 않음).
  noiseFilterLevel: NoiseFilterLevel
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
  setAutoDownload: (v: boolean) => void
  setFontScale: (v: FontScale) => void
  setNoiseFilterLevel: (v: NoiseFilterLevel) => void
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
      autoDownload: true,
      fontScale: 1,
      noiseFilterLevel: 0,
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
      setAutoDownload: (autoDownload) => set({ autoDownload }),
      setFontScale: (fontScale) => set({ fontScale }),
      setNoiseFilterLevel: (noiseFilterLevel) => set({ noiseFilterLevel }),
    }),
    {
      name: 'selah-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
