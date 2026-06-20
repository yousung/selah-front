import { Outlet, NavLink, useLocation } from 'react-router-dom'
import MiniPlayer from './MiniPlayer'
import QueuePanel from './QueuePanel'
import PwaInstallPrompt from './PwaInstallPrompt'
import MyPlaylistsSheet from './MyPlaylistsSheet'
import { useAudio } from '@/contexts/AudioContext'
import { useSettingsStore } from '@/store/settingsStore'
import { useQueueStore } from '@/store/queueStore'
import { cancelDownload } from '@/lib/mediaStore'
import React, { useState, useEffect } from 'react'

/* ─── Icons ─────────────────────────────────────────── */
function IconNote({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill={active ? c : 'none'} />
      <circle cx="18" cy="16" r="3" fill={active ? c : 'none'} />
    </svg>
  )
}
function IconMic({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" fill={active ? c : 'none'} />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="9" y1="23" x2="15" y2="23" />
    </svg>
  )
}
function IconBook({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill={active ? c : 'none'} />
    </svg>
  )
}
function IconPerson({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" fill={active ? c : 'none'} />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const navItems = [
  { to: '/', label: '찬송', Icon: IconNote },
  { to: '/sermon', label: '설교', Icon: IconMic, beta: true },
  { to: '/catechism', label: '교리서', Icon: IconBook },
  { to: '/my', label: 'MY', Icon: IconPerson },
]

/* ─── Logo ───────────────────────────────────────────── */
function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-[9px] font-semibold tracking-widest" style={{ color: 'var(--ink-3)', letterSpacing: '0.1em' }}>주님의 교회</p>
        <p style={{ fontSize: size === 'sm' ? 13 : 14, fontWeight: 700, color: 'var(--primary-700)', fontFamily: 'Noto Serif KR, serif', lineHeight: 1.3 }}>셀라</p>
      </div>
    </div>
  )
}


/* ─── Layout ─────────────────────────────────────────── */
export default function Layout() {
  const {
    currentVideo, stop,
    reactPlayerRef, videoUrl, videoSlotRef,
    onVideoPlay, onVideoPause, onVideoWaiting, onVideoCanPlay,
    onVideoTimeUpdate, onVideoLoadedMetadata, onVideoDurationChange,
    onVideoEnded, onVideoError,
  } = useAudio()
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const queueIds = useQueueStore((s) => s.ids)
  const location = useLocation()
  const isHymnPlayerPage = location.pathname.startsWith('/player/') || location.pathname.startsWith('/hymn/player/')
  const isPlayerPage = isHymnPlayerPage || location.pathname.startsWith('/sermon/player/')
  const [miniDismissed, setMiniDismissed] = useState(false)
  const queueOpen = useQueueStore((s) => s.isOpen)
  const toggleQueue = useQueueStore((s) => s.toggleQueue)
  const [videoRect, setVideoRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (currentVideo) setMiniDismissed(false)
  }, [currentVideo?.id])

  useEffect(() => {
    // 찬송/설교 모든 플레이어 페이지에서 비디오 슬롯에 영상 오버레이
    if (!isPlayerPage || mediaMode !== 'video') { setVideoRect(null); return }
    const update = () => {
      const slot = videoSlotRef.current
      if (!slot) { setVideoRect(null); return }
      const r = slot.getBoundingClientRect()
      setVideoRect(prev =>
        prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height
          ? prev : { left: r.left, top: r.top, width: r.width, height: r.height }
      )
    }
    update()
    const id = setInterval(update, 200)
    window.addEventListener('resize', update)
    return () => { clearInterval(id); window.removeEventListener('resize', update); setVideoRect(null) }
  }, [isPlayerPage, mediaMode, videoSlotRef])

  const showMini = !isPlayerPage && !!currentVideo && !miniDismissed

  const isActive = (to: string) => {
    const p = location.pathname
    if (to === '/') return p === '/' || p.startsWith('/playlist/') || p.startsWith('/player/') || p.startsWith('/hymn/player/')
    if (to === '/my') return p.startsWith('/my') || p === '/recent' || p === '/settings' || p === '/search'
    return p.startsWith(to)
  }

  const isHymnTab = isActive('/') || isActive('/sermon')
  const [fabOpen, setFabOpen] = useState(false)
  const [myPlaylistsOpen, setMyPlaylistsOpen] = useState(false)

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--surface-0)' }}>

      {/* ═══════════════ Desktop Sidebar (lg+) ═══════════════ */}
      <aside
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40"
        style={{ width: 240, background: 'var(--white)', borderRight: '1px solid var(--divider)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--divider)' }}>
          <NavLink to="/">
            <Logo />
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors text-sm font-medium"
                style={{
                  background: active ? 'var(--primary-50)' : 'transparent',
                  color: active ? 'var(--primary-700)' : 'var(--ink-1)',
                }}
              >
                <item.Icon active={active} />
                {item.label}
                {item.beta && (
                  <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706', lineHeight: 1.4 }}>
                    beta
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

      </aside>

      {/* ═══════════════ Main Column ═══════════════ */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[240px]">

        {/* ── Content ── */}
        {/* NOTE: overflow-y-auto 제거 — main이 scroll container가 되면 페이지 내부의
            position:sticky 헤더가 window 스크롤을 따라 사라진다. 실제 스크롤러는 window
            (body/#root min-h-dvh, SermonCategoryPage가 window.scrollTo 사용). overflow를
            visible로 두어야 sticky 헤더가 viewport 기준으로 고정된다. */}
        <main className="flex-1">
          <Outlet />
          {/* Bottom spacer so content isn't hidden behind mini player / nav */}
          <div style={{
            height: showMini
              ? 'calc(68px + 24px + 64px)'
              : 64
          }} className="lg:hidden" />
          {!isPlayerPage && (
            <div style={{ height: showMini ? 108 : 0 }} className="hidden lg:block" />
          )}
        </main>

        {/* ── Persistent Video Element (video mode navigation persistence) ── */}
        {mediaMode === 'video' && (
          <video
            ref={reactPlayerRef as React.RefObject<HTMLVideoElement>}
            src={videoUrl ?? undefined}
            playsInline
            style={videoRect ? {
              position: 'fixed',
              left: videoRect.left,
              top: videoRect.top,
              width: videoRect.width,
              height: videoRect.height,
              zIndex: 20,
              objectFit: 'cover',
              display: 'block',
              borderRadius: 20,
              pointerEvents: 'none',
            } : {
              position: 'fixed',
              left: -9999,
              top: 0,
              width: 1,
              height: 1,
              display: 'block',
              pointerEvents: 'none',
            }}
            onPlay={onVideoPlay}
            onPause={onVideoPause}
            onWaiting={onVideoWaiting}
            onCanPlay={onVideoCanPlay}
            onTimeUpdate={onVideoTimeUpdate}
            onLoadedMetadata={onVideoLoadedMetadata}
            onDurationChange={onVideoDurationChange}
            onEnded={onVideoEnded}
            onError={onVideoError}
          />
        )}

        {/* ── Universal Floating MiniPlayer ── */}
        {showMini && (
          <div
            className="fixed z-30 left-2 right-2 bottom-[84px] lg:bottom-6 lg:right-6 lg:left-[264px]"
            style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
          >
            <MiniPlayer onDismiss={() => {
              // 미니 플레이어를 완전히 닫으면 해당 미디어의 진행 중 다운로드도 취소
              if (currentVideo) { cancelDownload(currentVideo.id, 'audio'); cancelDownload(currentVideo.id, 'video') }
              stop()
              setMiniDismissed(true)
            }} />
          </div>
        )}

        {/* ── Speed-dial FAB (Hymn tab only) ── */}
        {isHymnTab && (
          <>
            {/* Backdrop */}
            {fabOpen && (
              <div
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.3)' }}
                onClick={() => setFabOpen(false)}
              />
            )}

            {/* Mini action: 내 재생목록 */}
            <div
              className="fixed z-50 flex items-center justify-end"
              style={{
                right: 16,
                bottom: showMini ? 170 + 68 : 80 + 68,
                opacity: fabOpen ? 1 : 0,
                transform: fabOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.85)',
                transition: 'opacity 200ms ease, transform 200ms ease',
                pointerEvents: fabOpen ? 'auto' : 'none',
                gap: 8,
              }}
            >
              <span
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full select-none"
                style={{
                  background: 'var(--white)',
                  color: 'var(--ink-0)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  whiteSpace: 'nowrap',
                }}
              >
                내 재생목록
              </span>
              <button
                className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{
                  width: 56,
                  height: 56,
                  background: 'var(--white)',
                  color: 'var(--primary-700)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  flexShrink: 0,
                }}
                onClick={() => { setFabOpen(false); setMyPlaylistsOpen(true) }}
                aria-label="내 재생목록"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.2}
                  strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>

            {/* Mini action: 현재 재생목록 */}
            <div
              className="fixed z-50 flex items-center justify-end"
              style={{
                right: 16,
                bottom: showMini ? 170 + 136 : 80 + 136,
                opacity: fabOpen ? 1 : 0,
                transform: fabOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.85)',
                transition: 'opacity 160ms ease 40ms, transform 160ms ease 40ms',
                pointerEvents: fabOpen ? 'auto' : 'none',
                gap: 8,
              }}
            >
              <span
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full select-none"
                style={{
                  background: queueIds.length > 0 ? 'var(--white)' : 'rgba(255,255,255,0.55)',
                  color: queueIds.length > 0 ? 'var(--ink-0)' : 'var(--ink-3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  whiteSpace: 'nowrap',
                }}
              >
                현재 재생목록
              </span>
              <button
                disabled={queueIds.length === 0}
                className="flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{
                  width: 56,
                  height: 56,
                  background: queueIds.length > 0 ? 'var(--white)' : 'rgba(255,255,255,0.55)',
                  color: queueIds.length > 0 ? 'var(--primary-700)' : 'var(--ink-3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  flexShrink: 0,
                  opacity: queueIds.length === 0 ? 0.5 : 1,
                }}
                onClick={() => { setFabOpen(false); toggleQueue() }}
                aria-label="현재 재생목록"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.2}
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="15" y2="18" />
                  <polyline points="17 15 21 18 17 21" />
                </svg>
              </button>
            </div>

            {/* Main FAB */}
            <button
              className="fixed z-50 flex items-center justify-center rounded-full transition-transform active:scale-95"
              style={{
                right: 16,
                bottom: showMini ? 170 : 80,
                width: 56,
                height: 56,
                background: 'var(--primary-700)',
                color: 'var(--white)',
                boxShadow: '0 4px 16px rgba(61,107,68,0.35)',
              }}
              onClick={() => setFabOpen((o) => !o)}
              aria-label={fabOpen ? '닫기' : '재생목록 메뉴'}
            >
              {fabOpen ? (
                /* ✕ close icon */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                /* + icon */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>

            {/* My Playlists Sheet */}
            {myPlaylistsOpen && (
              <MyPlaylistsSheet onClose={() => setMyPlaylistsOpen(false)} />
            )}
          </>
        )}

        {/* ── Queue Panel ── */}
        <QueuePanel isOpen={queueOpen} onClose={() => useQueueStore.setState({ isOpen: false })} />

        <PwaInstallPrompt />

        {/* ── Mobile + Tablet Bottom Nav ── */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center"
          style={{
            height: 64,
            background: 'var(--white)',
            borderTop: '1px solid var(--divider)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
              >
                <div className="relative">
                  <item.Icon active={active} />
                  {item.beta && (
                    <span className="absolute -top-1.5 -right-4 text-[8px] font-bold px-1 rounded-full leading-[14px]" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      beta
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium" style={{ color: active ? 'var(--primary-700)' : 'var(--ink-3)' }}>
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
