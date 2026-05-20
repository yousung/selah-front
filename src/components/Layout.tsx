import { Outlet, NavLink, useLocation } from 'react-router-dom'
import MiniPlayer from './MiniPlayer'
import { useAudio } from '@/contexts/AudioContext'
import { useState, useEffect } from 'react'

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
function IconSearch({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
function IconPerson({ active }: { active: boolean }) {
  const c = active ? 'var(--primary-700)' : 'var(--ink-3)'
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const navItems = [
  { to: '/', label: '홈', Icon: IconHome },
  { to: '/favorites', label: '즐겨찾기', Icon: IconStar },
  { to: '/search', label: '검색', Icon: IconSearch },
  { to: '/my', label: '설정', Icon: IconPerson },
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
  const { currentVideo } = useAudio()
  const location = useLocation()
  const isPlayerPage = location.pathname.startsWith('/player/')
  const [miniDismissed, setMiniDismissed] = useState(false)

  useEffect(() => {
    if (currentVideo) setMiniDismissed(false)
  }, [currentVideo?.id])

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
          <Logo />
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

        {/* ── Tablet Top Nav (md only, hidden on lg) ── */}
        <header
          className="hidden md:flex lg:hidden items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0"
          style={{ height: 60, background: 'var(--white)', borderBottom: '1px solid var(--divider)' }}
        >
          <Logo size="sm" />
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] transition-colors text-sm font-medium"
                  style={{
                    background: active ? 'var(--primary-50)' : 'transparent',
                    color: active ? 'var(--primary-700)' : 'var(--ink-1)',
                  }}
                >
                  <item.Icon active={active} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
          {/* Bottom spacer so content isn't hidden behind mini player / nav */}
          {!isPlayerPage && (
            <div style={{
              height: showMini
                ? 'calc(68px + 24px + 64px)'  // mini(68) + gap(24) + nav(64) on mobile; md+ has no nav
                : 64
            }} className="md:hidden" />
          )}
          {!isPlayerPage && (
            <div style={{ height: showMini ? 108 : 0 }} className="hidden md:block" />
          )}
        </main>

        {/* ── Universal Floating MiniPlayer ── */}
        {showMini && (
          <div
            className="fixed z-30 left-2 right-2 bottom-[84px] md:left-4 md:right-4 md:bottom-5 lg:bottom-6 lg:right-6 lg:left-[264px]"
            style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
          >
            <MiniPlayer onDismiss={() => setMiniDismissed(true)} />
          </div>
        )}

        {/* ── Mobile Bottom Nav ── */}
        {!isPlayerPage && (
          <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center"
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
        )}
      </div>
    </div>
  )
}
