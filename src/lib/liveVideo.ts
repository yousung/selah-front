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

export function openLiveVideoInNewTab(video: { isLive?: boolean | string | null; youtubeId?: string | null }) {
  if (!isLiveVideo(video.isLive) || !video.youtubeId) return false
  window.open(youtubeWatchUrl(video.youtubeId), '_blank', 'noopener,noreferrer')
  return true
}
