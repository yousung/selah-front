import { useLiveVideoStore } from '@/store/liveVideoStore'

export function isLiveVideo(isLive?: boolean | string | null) {
  return isLive === true || isLive === 'true'
}

export function isSecretVideo(isSecret?: boolean | string | null) {
  return isSecret === true || isSecret === 'true'
}

export function isPlayableInQueue(video: { isLive?: boolean | string | null; isSecret?: boolean | string | null }) {
  return !isLiveVideo(video.isLive) && !isSecretVideo(video.isSecret)
}

export function youtubeWatchUrl(youtubeId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`
}

/**
 * 방송중 영상이면 앱 안에서 유튜브 공식 IFrame 플레이어(`LiveVideoOverlay`)로 열고 true.
 * 일반 영상이면 false — 호출부가 평소대로 재생한다.
 */
export function openLiveVideo(video: { isLive?: boolean | string | null; youtubeId?: string | null; title?: string | null }) {
  if (!isLiveVideo(video.isLive) || !video.youtubeId) return false
  useLiveVideoStore.getState().open({ youtubeId: video.youtubeId, title: video.title ?? null })
  return true
}
