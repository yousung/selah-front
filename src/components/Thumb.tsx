import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { THUMB_ORDER, thumbQualityFor, ytIdFromUrl, buildThumb, getImageCacheBust } from '@/lib/thumb'

interface ThumbProps {
  src: string | null | undefined
  className?: string
  style?: React.CSSProperties
  alt?: string
  fallback?: React.ReactNode
}
/** 썸네일: 설정별 화질 + lazy + 로딩 스켈레톤 + 404 다운그레이드 + 캐시버스트.
 *  부모 컨테이너는 position relative + overflow hidden 이어야 스켈레톤이 제대로 깔린다. */
export default function Thumb({ src, className, style, alt = '', fallback }: ThumbProps) {
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const quality = useSettingsStore((s) => s.quality)
  const id = ytIdFromUrl(src)
  const startIdx = THUMB_ORDER.indexOf(thumbQualityFor(mediaMode, quality))
  const [cb] = useState(() => getImageCacheBust())
  const [qIdx, setQIdx] = useState(startIdx)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [triedHq, setTriedHq] = useState(false)
  useEffect(() => { setQIdx(startIdx); setLoaded(false); setFailed(false); setTriedHq(false) }, [src, startIdx])

  if (!id) {
    if (src) return <img src={src} alt={alt} className={className} style={style} loading="lazy" decoding="async" />
    return <>{fallback ?? null}</>
  }
  if (failed) return <>{fallback ?? null}</>
  const url = buildThumb(id, THUMB_ORDER[qIdx], cb)
  return (
    <>
      {!loaded && <span className="thumb-skeleton" aria-hidden="true" />}
      <img
        src={url}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
        onLoad={(e) => {
          // YouTube는 썸네일 없는 영상에 120x90 회색 placeholder를 200으로 반환.
          // hqdefault/mqdefault(원래 480/320 너비)가 120이면 placeholder → 폴백.
          if (e.currentTarget.naturalWidth <= 120 && THUMB_ORDER[qIdx] !== 'default') {
            setFailed(true); return
          }
          setLoaded(true)
        }}
        onError={() => {
          if (qIdx < THUMB_ORDER.length - 1) { setQIdx(qIdx + 1); setLoaded(false) }
          else if (!triedHq) {
            // 체인 끝까지 실패 → 항상 존재하는 hqdefault.jpg로 최종 폴백(1회)
            setTriedHq(true); setQIdx(THUMB_ORDER.indexOf('hqdefault')); setLoaded(false)
          }
          else setFailed(true)
        }}
      />
    </>
  )
}
