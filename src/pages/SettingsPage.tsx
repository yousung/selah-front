import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import type { Theme, AudioQuality, AutoNextDelay, MediaMode } from '@/store/settingsStore'

const LOCAL_STORAGE_KEYS_TO_KEEP = new Set(['selah-playlists', 'selah-settings'])
const CACHE_BUST_PARAM = 'selah-cache-bust'

function clearLocalStorageExcept(keysToKeep: Set<string>) {
  Object.keys(localStorage).forEach((key) => {
    if (!keysToKeep.has(key)) {
      localStorage.removeItem(key)
    }
  })
}

function clearCookies() {
  if (!document.cookie) return

  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter(Boolean)

  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const pathCandidates = new Set([
    '/',
    ...pathSegments.map((_, index) => `/${pathSegments.slice(0, index + 1).join('/')}`),
  ])

  const hostname = window.location.hostname
  const domainCandidates = hostname === 'localhost' || /^[\d.]+$/.test(hostname)
    ? ['']
    : ['', hostname, `.${hostname}`]

  cookieNames.forEach((name) => {
    pathCandidates.forEach((path) => {
      domainCandidates.forEach((domain) => {
        document.cookie = [
          `${name}=`,
          'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
          'Max-Age=0',
          `Path=${path}`,
          domain ? `Domain=${domain}` : '',
          'SameSite=Lax',
        ].filter(Boolean).join('; ')
      })
    })
  })
}

async function clearAppCache() {
  clearLocalStorageExcept(LOCAL_STORAGE_KEYS_TO_KEEP)
  clearCookies()

  // 서비스 워커 캐시 삭제
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
  }
}

function forceReloadApp() {
  const url = new URL(window.location.href)
  url.searchParams.set(CACHE_BUST_PARAM, Date.now().toString())
  window.location.replace(url.toString())
}

const QUALITY_OPTIONS: { value: AudioQuality; label: string; desc: string }[] = [
  { value: 'high', label: '고음질', desc: '최대 비트레이트' },
  { value: 'medium', label: '보통', desc: '균형 잡힌 품질' },
  { value: 'low', label: '저음질', desc: '데이터 절약' },
]

const AUTO_NEXT_OPTIONS: { value: AutoNextDelay; label: string; desc: string }[] = [
  { value: 'immediate', label: '바로 재생', desc: '곡이 끝나면 즉시 다음 곡' },
  { value: '3s', label: '3초 후 재생', desc: '잠시 후 다음 곡으로 이동' },
  { value: '5s', label: '5초 후 재생', desc: '여유 있게 다음 곡으로 이동' },
  { value: 'off', label: '자동 재생 안함', desc: '다음 곡으로 이동하지 않음' },
]

const MEDIA_MODE_OPTIONS: { value: MediaMode; label: string; desc: string }[] = [
  { value: 'audio', label: '오디오', desc: '음악만 재생합니다' },
  { value: 'video', label: '비디오', desc: '영상과 함께 재생합니다' },
]

export default function SettingsPage() {
  const { theme, quality, mediaMode, autoPlayOnDetail, autoNextDelay, setTheme, setQuality, setMediaMode, setAutoPlayOnDetail, setAutoNextDelay } = useSettingsStore()
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  const handleClearCache = async () => {
    setClearing(true)
    await clearAppCache()
    setClearing(false)
    setCleared(true)
    setTimeout(forceReloadApp, 300)
  }

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center px-4"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>설정</h1>
      </header>

      <div className="p-5 space-y-5">
        {/* Theme */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>테마</p>
          <div className="card overflow-hidden">
            {(['light', 'dark'] as Theme[]).map((t, i) => {
              const active = theme === t
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: i === 0 ? '1px solid var(--divider)' : 'none',
                    background: active ? 'var(--primary-50)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 18 }}>{t === 'light' ? '☀️' : '🌙'}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>
                      {t === 'light' ? '라이트' : '다크'}
                    </span>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Media mode */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>미디어 모드</p>
          <div className="card overflow-hidden">
            {MEDIA_MODE_OPTIONS.map((opt, i) => {
              const active = mediaMode === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setMediaMode(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: i < MEDIA_MODE_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                    background: active ? 'var(--primary-50)' : 'transparent',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>{opt.label}</p>
                    <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>{opt.desc}</p>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Audio quality */}
        <div style={{ opacity: mediaMode === 'video' ? 0.5 : 1 }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>음질</p>
          {mediaMode === 'video' ? (
            <div className="card px-4 py-3.5">
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>비디오는 현재 해상도 모드를 조절할 수 없습니다.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {QUALITY_OPTIONS.map((opt, i) => {
                const active = quality === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setQuality(opt.value)}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                    style={{
                      borderBottom: i < QUALITY_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                      background: active ? 'var(--primary-50)' : 'transparent',
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>{opt.label}</p>
                      <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>{opt.desc}</p>
                    </div>
                    {active && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Playback */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>재생</p>
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setAutoPlayOnDetail(!autoPlayOnDetail)}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
              style={{ background: autoPlayOnDetail ? 'var(--primary-50)' : 'transparent' }}
            >
              <div>
                <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>상세페이지 자동 재생</p>
                <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                  홈에서 영상을 열 때 바로 재생합니다.
                </p>
              </div>
              <span
                className="relative inline-flex flex-shrink-0 transition-colors"
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 999,
                  background: autoPlayOnDetail ? 'var(--primary-700)' : 'var(--surface-3)',
                }}
                aria-hidden="true"
              >
                <span
                  className="absolute transition-transform"
                  style={{
                    width: 20,
                    height: 20,
                    top: 2,
                    left: 2,
                    borderRadius: '50%',
                    background: 'var(--white)',
                    transform: autoPlayOnDetail ? 'translateX(18px)' : 'translateX(0)',
                  }}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Auto next */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>다음곡 자동재생</p>
          <div className="card overflow-hidden">
            {AUTO_NEXT_OPTIONS.map((opt, i) => {
              const active = autoNextDelay === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setAutoNextDelay(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: i < AUTO_NEXT_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                    background: active ? 'var(--primary-50)' : 'transparent',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>{opt.label}</p>
                    <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>{opt.desc}</p>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cache */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>데이터 관리</p>
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
              style={{ background: 'transparent' }}
            >
              <div>
                <p className="text-sm font-medium text-left" style={{ color: cleared ? 'var(--accent-500)' : 'var(--ink-0)' }}>
                  {cleared ? '캐시가 삭제되었습니다' : clearing ? '삭제 중...' : '캐시 삭제'}
                </p>
                <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                  재생 기록, 대기열 등 임시 데이터를 삭제하고 새로고침합니다. 재생목록은 유지됩니다.
                </p>
              </div>
              {!cleared && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              )}
              {cleared && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--accent-500)', flexShrink: 0 }}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* App info */}
        <div className="card divide-y" style={{ borderColor: 'var(--divider)' }}>
          {[
            { label: '제작', value: '주님의 교회' },
            { label: '앱 버전', value: import.meta.env.VITE_APP_VERSION ? `Selah ${import.meta.env.VITE_APP_VERSION}` : 'BETA' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
