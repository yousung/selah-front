import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAudio } from '@/contexts/AudioContext'
import { useLiveVideoStore } from '@/store/liveVideoStore'
import { useSettingsStore } from '@/store/settingsStore'
import { loadYouTubeIframeApi, type YTPlayer } from '@/lib/youtubeIframeApi'
import { youtubeWatchUrl } from '@/lib/liveVideo'

/**
 * 방송중(`isLive`) 영상 플레이어 — 유튜브 공식 IFrame Player API로 실시간 재생한다.
 * 스트림은 유튜브가 직접 보낸다(Invidious·백엔드 경유 없음). 열리면 앱 오디오를 멈춘다(두 소리 겹침 방지).
 * `openLiveVideo()`(lib/liveVideo.ts)가 store를 채우면 Layout에 마운트된 이 컴포넌트가 뜬다.
 */
export default function LiveVideoOverlay() {
  const live = useLiveVideoStore((s) => s.live)
  const close = useLiveVideoStore((s) => s.close)
  const fontScale = useSettingsStore((s) => s.fontScale)
  const { isPlaying, pause } = useAudio()
  const hostRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  // 오류는 어느 방송의 것인지 같이 들고 있는다 — 다른 방송을 열 때 이전 오류가 한 프레임 비치지 않게.
  const [error, setError] = useState<{ id: string; msg: string } | null>(null)
  const youtubeId = live?.youtubeId ?? null

  // 앱 오디오를 멈춘다(토글 아님) — 열 때, 열린 동안 앱 오디오가 늦게 시작될 때, 유튜브 재생이 시작될 때.
  const pauseRef = useRef(pause)
  pauseRef.current = pause
  useEffect(() => {
    if (youtubeId) pause()
  }, [youtubeId, isPlaying, pause])

  // 뒤로가기(안드로이드 하드웨어 버튼 포함)로 오버레이만 닫히게 히스토리 항목을 하나 쌓는다.
  useEffect(() => {
    if (!youtubeId) return
    window.history.pushState({ ...(window.history.state ?? {}), liveOverlay: true }, '')
    const onPop = () => close()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [youtubeId, close])

  // 열린 동안 뒤 페이지 스크롤 잠금 + 포커스를 닫기 버튼으로, 닫히면 원래 자리로.
  useEffect(() => {
    if (!youtubeId) return
    const prevFocus = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [youtubeId])

  useEffect(() => {
    if (!youtubeId || !hostRef.current) return
    let cancelled = false
    // YT.Player는 넘긴 엘리먼트를 iframe으로 **교체**한다 → React가 관리하지 않는 자식 div를 따로 만든다.
    const mount = document.createElement('div')
    mount.style.width = '100%'
    mount.style.height = '100%'
    hostRef.current.appendChild(mount)

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return
        playerRef.current = new YT.Player(mount, {
          videoId: youtubeId,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: (e) => { e.target.playVideo() },
            onStateChange: (e) => { if (e.data === YT.PlayerState.PLAYING) pauseRef.current() },
            onError: (e) => {
              // 101/150: 소유자가 외부 삽입을 막음, 100: 없는/비공개 영상, 2·5: 잘못된 요청/HTML5 오류
              setError({
                id: youtubeId,
                msg: e.data === 101 || e.data === 150 ? '이 방송은 앱 안에서 재생할 수 없습니다.' : '방송을 불러올 수 없습니다.',
              })
            },
          },
        })
      })
      .catch(() => { if (!cancelled) setError({ id: youtubeId, msg: '유튜브 플레이어를 불러올 수 없습니다.' }) })

    return () => {
      cancelled = true
      try { playerRef.current?.destroy() } catch { /* 이미 정리됨 */ }
      playerRef.current = null
      mount.remove()
    }
  }, [youtubeId])

  // 닫기: 우리가 쌓은 히스토리 항목이 있으면 뒤로가기로 지운다(popstate → close). 없으면 바로 닫는다.
  const dismiss = useCallback(() => {
    if ((window.history.state as { liveOverlay?: boolean } | null)?.liveOverlay) window.history.back()
    else close()
  }, [close])

  useEffect(() => {
    if (!youtubeId) return
    // 유튜브 iframe에 포커스가 들어가면 키 입력이 그쪽으로 가서 Esc가 안 온다(교차 출처) — ✕/배경/뒤로가기로 닫는다.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [youtubeId, dismiss])

  if (!live || !youtubeId) return null
  const errorMsg = error?.id === youtubeId ? error.msg : null

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', ['--font-scale' as string]: fontScale } as React.CSSProperties}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
      role="dialog"
      aria-modal="true"
      aria-label="실시간 방송"
    >
      <div className="w-full flex flex-col gap-3" style={{ maxWidth: 960 }}>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="flex-shrink-0 rounded text-xs font-bold text-white"
            style={{ background: '#E53935', padding: '2px 8px' }}
          >
            LIVE
          </span>
          <h2 className="flex-1 min-w-0 truncate text-base font-semibold text-white">{live.title || '실시간 방송'}</h2>
          <button
            ref={closeBtnRef}
            onClick={dismiss}
            aria-label="닫기"
            className="flex-shrink-0 flex items-center justify-center text-white"
            style={{ fontSize: 22, lineHeight: 1, minWidth: 44, minHeight: 44 }}
          >
            ✕
          </button>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: '16/9', background: '#000', maxHeight: 'calc(100dvh - 140px)' }}
        >
          <div ref={hostRef} className="absolute inset-0" />
          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center" style={{ background: '#000' }}>
              <p className="text-sm text-white">{errorMsg}</p>
              <a
                href={youtubeWatchUrl(youtubeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full text-sm font-semibold text-white"
                style={{ background: '#FF0000', padding: '8px 16px' }}
              >
                YouTube에서 보기
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
