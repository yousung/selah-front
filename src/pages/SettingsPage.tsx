import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import type { Theme, AudioQuality, AutoNextDelay, MediaMode, OfflineStorageMode } from '@/store/settingsStore'
import { clearAllMedia, isOfflineMediaSupported, storageInfo, enforceStoragePolicy } from '@/lib/mediaStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { useAudio } from '@/contexts/AudioContext'

const PLAYBACK_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: '0.5x' },
  { value: 0.7, label: '0.7x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
]

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

const OFFLINE_MODE_OPTIONS: { value: OfflineStorageMode; label: string; desc: string }[] = [
  { value: 'thrift', label: '절약', desc: '한 곡만 저장' },
  { value: 'normal', label: '보통', desc: '최대 500MB까지 저장' },
  { value: 'generous', label: '넉넉', desc: '최대 1GB까지 저장' },
  { value: 'custom', label: '최대', desc: '최대 2GB까지 저장' },
]

/** 섹션 헤더 — 그룹 제목 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>
      {children}
    </p>
  )
}

export default function SettingsPage() {
  const {
    theme, quality, mediaMode, autoPlayOnDetail, autoNextDelay, playbackRate,
    showCatechismHeadings, showCatechismToc,
    offlineStorageMode, autoDownload,
    setTheme, setQuality, setMediaMode, setAutoPlayOnDetail, setAutoNextDelay,
    setPlaybackRate, setShowCatechismHeadings, setShowCatechismToc,
    setOfflineStorageMode, setAutoDownload,
  } = useSettingsStore()
  const { currentVideo } = useAudio()
  const [clearing, setClearing] = useState(false)

  // 저장 모드 변경 시 즉시 새 정책으로 기존 다운로드를 정리한다.
  // 현재 재생 중인 곡은 보존(excludeKey)해 재생이 끊기지 않게 한다.
  const handleStorageModeChange = async (mode: OfflineStorageMode) => {
    setOfflineStorageMode(mode)
    const excludeKey = currentVideo ? `${currentVideo.id}-${mediaMode === 'video' ? 'video' : 'audio'}` : undefined
    try { await enforceStoragePolicy(excludeKey) } catch {}
    useCachedMediaStore.getState().refresh()
    try { const info = await storageInfo(); setUsedBytes(info.used) } catch {}
  }
  const [cleared, setCleared] = useState(false)
  const [clearingMedia, setClearingMedia] = useState(false)
  const [clearedMedia, setClearedMedia] = useState(false)
  const [usedBytes, setUsedBytes] = useState<number | null>(null)
  const [versionTaps, setVersionTaps] = useState(0)
  const offlineMediaOk = isOfflineMediaSupported()

  // 앱 버전 5회 연속 탭 → 디버그 오버레이 토글 (사용자 진단용 숨김 기능)
  const handleVersionTap = () => {
    const next = versionTaps + 1
    setVersionTaps(next)
    if (next >= 5) {
      setVersionTaps(0)
      const enabled = localStorage.getItem('selah-debug') === '1'
      if (enabled) {
        localStorage.removeItem('selah-debug')
        window.alert('디버그 모드 OFF')
      } else {
        localStorage.setItem('selah-debug', '1')
        window.alert('디버그 모드 ON — 화면 우하단에 진단 오버레이가 나타납니다.')
      }
    }
  }

  useEffect(() => {
    if (!offlineMediaOk) return
    storageInfo().then((info) => setUsedBytes(info.used)).catch(() => {})
  }, [offlineMediaOk])

  const handleClearCache = async () => {
    setClearing(true)
    await clearAppCache()
    setClearing(false)
    setCleared(true)
    setTimeout(forceReloadApp, 300)
  }

  const handleClearMedia = async () => {
    setClearingMedia(true)
    try {
      await clearAllMedia()
      useCachedMediaStore.getState().refresh()
      setUsedBytes(0)
      setClearedMedia(true)
      setTimeout(() => setClearedMedia(false), 3000)
    } finally {
      setClearingMedia(false)
    }
  }

  // 위험(파괴적) 작업 구분선 — 비파괴 설정과 삭제 액션 사이
  const dangerDivider = (
    <div style={{ height: 1, background: 'var(--divider)', margin: '8px 16px' }} />
  )

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center px-4"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>설정</h1>
      </header>

      <div className="p-5 space-y-8">

        {/* ════════════ 재생 ════════════ */}
        <section>
          <SectionLabel>재생</SectionLabel>
          <div className="space-y-3">

            {/* Media mode */}
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

            {/* Audio quality */}
            <div style={{ opacity: mediaMode === 'video' ? 0.5 : 1 }}>
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

            {/* Playback rate */}
            <div className="card overflow-hidden">
              <div className="flex" style={{ borderBottom: 'none' }}>
                {PLAYBACK_RATE_OPTIONS.map((opt, i) => {
                  const active = playbackRate === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPlaybackRate(opt.value)}
                      className="flex-1 flex items-center justify-center py-3 text-sm font-medium transition-colors"
                      style={{
                        borderRight: i < PLAYBACK_RATE_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                        background: active ? 'var(--primary-50)' : 'transparent',
                        color: active ? 'var(--primary-700)' : 'var(--ink-1)',
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Auto play on detail */}
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

            {/* Auto next delay */}
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
        </section>

        {/* ════════════ 표시 ════════════ */}
        <section>
          <SectionLabel>표시</SectionLabel>
          <div className="space-y-3">

            {/* Theme */}
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

            {/* 교리서 */}
            <div className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCatechismHeadings(!showCatechismHeadings)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                style={{ background: showCatechismHeadings ? 'var(--primary-50)' : 'transparent', borderBottom: '1px solid var(--divider)' }}
              >
                <div>
                  <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>교리서 본문 제목 표시</p>
                  <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                    교리서 본문에 각 항목의 제목을 표시합니다.
                  </p>
                </div>
                <span
                  className="relative inline-flex flex-shrink-0 transition-colors"
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 999,
                    background: showCatechismHeadings ? 'var(--primary-700)' : 'var(--surface-3)',
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
                      transform: showCatechismHeadings ? 'translateX(18px)' : 'translateX(0)',
                    }}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowCatechismToc(!showCatechismToc)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                style={{ background: showCatechismToc ? 'var(--primary-50)' : 'transparent' }}
              >
                <div>
                  <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>교리서 제목가이드 표시</p>
                  <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                    교리서 목차(제목가이드)를 표시합니다.
                  </p>
                </div>
                <span
                  className="relative inline-flex flex-shrink-0 transition-colors"
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 999,
                    background: showCatechismToc ? 'var(--primary-700)' : 'var(--surface-3)',
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
                      transform: showCatechismToc ? 'translateX(18px)' : 'translateX(0)',
                    }}
                  />
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ════════════ 저장 · 데이터 ════════════ */}
        {offlineMediaOk && (
          <section>
            <SectionLabel>저장 · 데이터</SectionLabel>
            <div className="space-y-3">

                {/* 오프라인 저장 모드 */}
                <div className="card overflow-hidden">
                  {OFFLINE_MODE_OPTIONS.map((opt, i) => {
                    const active = offlineStorageMode === opt.value
                    const isLast = i === OFFLINE_MODE_OPTIONS.length - 1
                    return (
                      <div key={opt.value}>
                        <button
                          onClick={() => handleStorageModeChange(opt.value)}
                          className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                          style={{
                            borderBottom: !isLast ? '1px solid var(--divider)' : 'none',
                            background: active ? 'var(--primary-50)' : 'transparent',
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>{opt.label}</p>
                            <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>{opt.desc}</p>
                          </div>
                          {active && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)', flexShrink: 0 }}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* 자동 다운로드 */}
                <div className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAutoDownload(!autoDownload)}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                    style={{ background: autoDownload ? 'var(--primary-50)' : 'transparent' }}
                  >
                    <div>
                      <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>재생 시 자동 다운로드</p>
                      <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                        영상 재생 시작 시 자동으로 오프라인 저장합니다.
                      </p>
                    </div>
                    <span
                      className="relative inline-flex flex-shrink-0 transition-colors"
                      style={{ width: 42, height: 24, borderRadius: 999, background: autoDownload ? 'var(--primary-700)' : 'var(--surface-3)' }}
                      aria-hidden="true"
                    >
                      <span
                        className="absolute transition-transform"
                        style={{ width: 20, height: 20, top: 2, left: 2, borderRadius: '50%', background: 'var(--white)', transform: autoDownload ? 'translateX(18px)' : 'translateX(0)' }}
                      />
                    </span>
                  </button>
                </div>

            {dangerDivider}

            {/* 저장된 내용 모두 지우기 (오프라인 미디어 + 이어듣기) */}
              <div className="card overflow-hidden">
                <button
                  type="button"
                  onClick={handleClearMedia}
                  disabled={clearingMedia}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{ background: 'transparent' }}
                >
                  <div>
                    <p className="text-sm font-medium text-left" style={{ color: clearedMedia ? 'var(--accent-500)' : '#dc2626' }}>
                      {clearedMedia ? '삭제 완료' : clearingMedia ? '삭제 중...' : '저장된 내용 모두 지우기'}
                    </p>
                    <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                      {usedBytes != null && usedBytes > 0
                        ? `현재 ${usedBytes >= 1024 * 1024 * 1024 ? `${(usedBytes / (1024 * 1024 * 1024)).toFixed(1)}GB` : `${(usedBytes / (1024 * 1024)).toFixed(0)}MB`} 저장됨 · `
                        : ''}오프라인으로 저장된 미디어와 이어듣기 위치를 모두 삭제합니다.
                    </p>
                  </div>
                  {!clearedMedia && !clearingMedia && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                  {clearedMedia && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--accent-500)', flexShrink: 0 }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </div>

            {/* 캐시 삭제 */}
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
          </section>
        )}

        {/* ════════════ 정보 ════════════ */}
        <section>
          <SectionLabel>정보</SectionLabel>
          <div className="card divide-y" style={{ borderColor: 'var(--divider)' }}>
            {[
              { label: '제작', value: '주님의 교회' },
              { label: '앱 버전', value: import.meta.env.VITE_APP_VERSION ? `Selah ${import.meta.env.VITE_APP_VERSION}` : 'BETA' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3.5"
                onClick={label === '앱 버전' ? handleVersionTap : undefined}
              >
                <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
