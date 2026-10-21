import { useCallback, useEffect, useState, type RefObject } from 'react'

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void }
type FsEl = HTMLVideoElement & {
  webkitRequestFullscreen?: () => void
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

/**
 * <video> 전체화면 토글. 엘리먼트를 옮기거나 리마운트하지 않는다(재버퍼링 방지).
 * 표준/webkit Fullscreen API 우선, iOS Safari(비-video 요소 불가·video도 API 없음)는 webkitEnterFullscreen.
 */
export function useVideoFullscreen(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const doc = document as FsDoc
    const sync = () => {
      const el = videoRef.current as FsEl | null
      const cur = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
      const std = !!el && cur === el
      // 데스크탑/안드로이드 전체화면에는 컨트롤이 없으므로 전체화면 동안만 네이티브 controls를 켠다.
      // (iOS webkitEnterFullscreen은 자체 UI가 있다.)
      if (el) el.controls = std
      setIsFullscreen(std || !!el?.webkitDisplayingFullscreen)
    }
    const el = videoRef.current
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    el?.addEventListener('webkitbeginfullscreen', sync)
    el?.addEventListener('webkitendfullscreen', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
      el?.removeEventListener('webkitbeginfullscreen', sync)
      el?.removeEventListener('webkitendfullscreen', sync)
    }
  }, [videoRef])

  const toggle = useCallback(() => {
    const el = videoRef.current as FsEl | null
    if (!el) return
    const doc = document as FsDoc
    if (isFullscreen || doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {})
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
      else el.webkitExitFullscreen?.()
      return
    }
    if (el.requestFullscreen) void el.requestFullscreen().catch(() => el.webkitEnterFullscreen?.())
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    else el.webkitEnterFullscreen?.()
  }, [videoRef, isFullscreen])

  return { isFullscreen, toggle }
}
