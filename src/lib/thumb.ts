import type { MediaMode, AudioQuality } from '@/store/settingsStore'
export type ThumbQuality = 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault'
// 내림차순(고화질→저화질): 다운그레이드는 인덱스 증가
export const THUMB_ORDER: ThumbQuality[] = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default']
export function thumbQualityFor(mediaMode: MediaMode, quality: AudioQuality): ThumbQuality {
  // sddefault·maxresdefault는 YouTube가 항상 생성하지 않아 404 빈발 → 시작 등급으로 쓰지 않는다.
  // hqdefault(480x360)는 항상 존재하는 최고 등급.
  if (mediaMode === 'video') return 'hqdefault'
  if (quality === 'high') return 'hqdefault'
  if (quality === 'medium') return 'hqdefault'
  return 'mqdefault'
}
/** 기존 ytimg 썸네일 URL에서 youtubeId 추출. ytimg 아니면 null. */
export function ytIdFromUrl(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/vi\/([^/]+)\//)
  return m ? m[1] : null
}
const CB_KEY = 'selah-img-cb'
/** 이미지 캐시버스트 토큰 읽기(없으면 빈문자열). */
export function getImageCacheBust(): string {
  try { return localStorage.getItem(CB_KEY) || '' } catch { return '' }
}
/** 캐시 초기화 시 호출 — 토큰을 새 타임스탬프로 갱신해 썸네일 강제 재요청. */
export function bumpImageCacheBust(): void {
  try { localStorage.setItem(CB_KEY, String(Date.now())) } catch {}
}
/** 화질 + 캐시버스트 적용한 ytimg URL. */
export function buildThumb(id: string, q: ThumbQuality, cb: string): string {
  const base = `https://i.ytimg.com/vi/${id}/${q}.jpg`
  return cb ? `${base}?cb=${cb}` : base
}
/** img가 아닌 곳(mediaSession artwork 등)용 단순 URL 빌더. */
export function thumbUrl(src: string | null | undefined, q: ThumbQuality): string | undefined {
  const id = ytIdFromUrl(src)
  if (!id) return src ?? undefined
  return buildThumb(id, q, getImageCacheBust())
}
