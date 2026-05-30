import { Outlet, NavLink, useLocation } from 'react-router-dom'
import MiniPlayer from './MiniPlayer'
import QueuePanel from './QueuePanel'
import PwaInstallPrompt from './PwaInstallPrompt'
import { useAudio } from '@/contexts/AudioContext'
import { useSettingsStore } from '@/store/settingsStore'
import { useQueueStore } from '@/store/queueStore'
import React, { useState, useEffect } from 'react'

/* ─── Icons ─────────────────────────────────────────── */
function IconHome({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}
function IconStar({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
function IconClock({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconSettings({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function IconSearch({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}


const navItems = [
  { to: '/', label: '홈', Icon: IconHome },
  { to: '/my-playlists', label: '내 목록', Icon: IconStar },
  { to: '/search', label: '검색', Icon: IconSearch },
  { to: '/recent', label: '최근', Icon: IconClock },
  { to: '/settings', label: '설정', Icon: IconSettings },
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
  const isPlayerPage = location.pathname.startsWith('/player/')
  const [miniDismissed, setMiniDismissed] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [videoRect, setVideoRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (currentVideo) setMiniDismissed(false)
  }, [currentVideo?.id])

  useEffect(() => {
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

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

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
              </NavLink>
            )
          })}
        </nav>

      </aside>

      {/* ═══════════════ Main Column ═══════════════ */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[240px]">

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto">
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
            <MiniPlayer onDismiss={() => { stop(); setMiniDismissed(true) }} />
          </div>
        )}

        {/* ── Queue FAB ── */}
        {queueIds.length > 0 && (
          <button
            className="fixed z-50 flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              right: 16,
              bottom: showMini ? 170 : 80,
              width: 46,
              height: 46,
              background: 'var(--primary-700)',
              color: 'var(--white)',
              boxShadow: '0 4px 16px rgba(61,107,68,0.35)',
            }}
            onClick={() => setQueueOpen((v) => !v)}
            aria-label="재생목록 열기"
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={2.2}
              strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="15" y2="18" />
              <polyline points="17 15 21 18 17 21" />
            </svg>
          </button>
        )}

        {/* ── Queue Panel ── */}
        <QueuePanel isOpen={queueOpen} onClose={() => setQueueOpen(false)} />

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
                <item.Icon active={active} />
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
