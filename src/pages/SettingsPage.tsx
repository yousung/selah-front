import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import type { Theme, AudioQuality, AutoNextDelay, MediaMode, OfflineStorageMode, FontScale } from '@/store/settingsStore'
import { clearAllMedia, isOfflineMediaSupported, storageInfo, enforceStoragePolicy } from '@/lib/mediaStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { useAudio } from '@/contexts/AudioContext'
import { fs } from '@/lib/fontScale'
import { bumpImageCacheBust } from '@/lib/thumb'

const PLAYBACK_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: '0.5x' },
  { value: 0.7, label: '0.7x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
]

const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: 1, label: '보통' },
  { value: 1.5, label: '크게' },
  { value: 2, label: '매우크게' },
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
  // localStorage를 비운 직후 이미지 캐시버스트 토큰 갱신(비운 뒤여야 토큰이 살아남음).
  // 이어지는 forceReloadApp 리로드 후 모든 썸네일이 새 cb 토큰으로 강제 재요청된다.
  bumpImageCacheBust()
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

const QUALITY_OPTIONS: { value: AudioQuality; label: string }[] = [
  { value: 'high', label: '고음질' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '저음질' },
]

const AUTO_NEXT_OPTIONS: { value: AutoNextDelay; label: string }[] = [
  { value: 'immediate', label: '바로' },
  { value: '3s', label: '3초 후' },
  { value: '5s', label: '5초 후' },
  { value: 'off', label: '안함' },
]

const MEDIA_MODE_OPTIONS: { value: MediaMode; label: string }[] = [
  { value: 'audio', label: '오디오' },
  { value: 'video', label: '비디오' },
]

const OFFLINE_MODE_OPTIONS: { value: OfflineStorageMode; label: string; desc: string }[] = [
  { value: 'thrift', label: '절약', desc: '현재 곡만 저장 · 이어듣기 지원 · 멀티 다운로드 미지원' },
  { value: 'normal', label: '보통', desc: '최대 500MB까지 저장' },
  { value: 'generous', label: '넉넉', desc: '최대 1GB까지 저장' },
  { value: 'custom', label: '최대', desc: '최대 2GB까지 저장' },
]

/** 외곽 섹션 박스 — 대분류(재생/표시/저장·데이터/정보)를 묶는 fieldset */
function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="relative rounded-[18px] px-3 pt-3 pb-4 min-w-0 w-full box-border m-0" style={{ border: '1px solid var(--divider)' }}>
      <legend className="text-base font-bold px-1.5 ml-1" style={{ color: 'var(--primary-700)' }}>{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  )
}

/** 개별 설정 박스 — 테두리 좌상단에 끊긴 제목 + 컨트롤 + 박스 밑 설명 */
function Field({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="relative rounded-[14px] px-3.5 pt-3 pb-3.5 min-w-0 w-full box-border m-0" style={{ border: '1px solid var(--divider)', background: 'var(--white)' }}>
      <legend className="text-sm font-semibold px-1.5 ml-1" style={{ color: 'var(--ink-0)' }}>{title}</legend>
      {children}
      {description && <p className="text-xs mt-2.5 leading-relaxed" style={{ color: 'var(--ink-2)' }}>{description}</p>}
    </fieldset>
  )
}

/** 세그먼트 칩 — 단일 선택 컨트롤 */
function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-colors text-center whitespace-nowrap"
            style={{ minWidth: 52, background: active ? 'var(--primary-700)' : 'var(--surface-2)', color: active ? 'var(--white)' : 'var(--ink-1)' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** 토글 설정용 fieldset 박스 */
function ToggleField({ title, description, checked, onChange }: { title: string; description?: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <Field title={title} description={description}>
      <button type="button" onClick={onChange} className="w-full flex items-center justify-between" style={{ background: 'transparent' }}>
        <span className="text-sm" style={{ color: 'var(--ink-1)' }}>{checked ? '켜짐' : '꺼짐'}</span>
        <span className="relative inline-flex flex-shrink-0 transition-colors" style={{ width: 42, height: 24, borderRadius: 999, background: checked ? 'var(--primary-700)' : 'var(--surface-3)' }} aria-hidden="true">
          <span className="absolute transition-transform" style={{ width: 20, height: 20, top: 2, left: 2, borderRadius: '50%', background: 'var(--white)', transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
        </span>
      </button>
    </Field>
  )
}

export default function SettingsPage() {
  const {
    theme, quality, mediaMode, autoPlayOnDetail, autoNextDelay, playbackRate,
    showCatechismHeadings, showCatechismToc,
    offlineStorageMode, autoDownload, fontScale,
    setTheme, setQuality, setMediaMode, setAutoPlayOnDetail, setAutoNextDelay,
    setPlaybackRate, setShowCatechismHeadings, setShowCatechismToc,
    setOfflineStorageMode, setAutoDownload, setFontScale,
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

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center px-4"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>설정</h1>
      </header>

      <div className="p-5 space-y-5">

        {/* ════════════ 재생 ════════════ */}
        <SectionBox title="재생">
          <Field title="미디어 모드" description="오디오는 음악만, 비디오는 영상과 함께 재생합니다.">
            <Segmented value={mediaMode} onChange={setMediaMode} options={MEDIA_MODE_OPTIONS} />
          </Field>

          {mediaMode === 'video' ? (
            <Field title="음질" description="비디오는 음질을 조절할 수 없습니다.">
              <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                <Segmented value={quality} onChange={setQuality} options={QUALITY_OPTIONS} />
              </div>
            </Field>
          ) : (
            <Field title="음질" description="음질이 높을수록 데이터 사용량이 늘어납니다.">
              <Segmented value={quality} onChange={setQuality} options={QUALITY_OPTIONS} />
            </Field>
          )}

          <Field title="재생 속도" description="재생 속도는 설교에만 적용됩니다. 찬송은 항상 정속으로 재생됩니다.">
            <Segmented value={playbackRate} onChange={setPlaybackRate} options={PLAYBACK_RATE_OPTIONS} />
          </Field>

          <ToggleField
            title="상세페이지 자동 재생"
            description="홈에서 영상을 열 때 바로 재생합니다."
            checked={autoPlayOnDetail}
            onChange={() => setAutoPlayOnDetail(!autoPlayOnDetail)}
          />

          <Field title="다음 곡 자동 재생" description="곡이 끝난 뒤 다음 곡으로 넘어가는 시점을 정합니다.">
            <Segmented value={autoNextDelay} onChange={setAutoNextDelay} options={AUTO_NEXT_OPTIONS} />
          </Field>
        </SectionBox>

        {/* ════════════ 표시 ════════════ */}
        <SectionBox title="표시">
          <Field title="테마" description="앱 화면 밝기 테마를 선택합니다.">
            <Segmented
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light' as Theme, label: '라이트' },
                { value: 'dark' as Theme, label: '다크' },
              ]}
            />
          </Field>

          <Field title="글자 크기" description="화면 전체의 글자 크기를 조절합니다.">
            <Segmented<number>
              value={fontScale}
              onChange={(v) => setFontScale(v as FontScale)}
              options={FONT_SCALE_OPTIONS}
            />
            <p className="px-1 mt-2.5" style={{ color: 'var(--ink-2)', fontSize: fs(14) }}>
              가나다 ABC 미리보기 · 잠시 멈추어, 듣다
            </p>
          </Field>

          <ToggleField
            title="교리서 본문 제목"
            description="교리서 본문에 각 항목의 제목을 표시합니다."
            checked={showCatechismHeadings}
            onChange={() => setShowCatechismHeadings(!showCatechismHeadings)}
          />

          <ToggleField
            title="교리서 제목 가이드"
            description="교리서 목차(제목 가이드)를 표시합니다."
            checked={showCatechismToc}
            onChange={() => setShowCatechismToc(!showCatechismToc)}
          />
        </SectionBox>

        {/* ════════════ 저장 · 데이터 ════════════ */}
        {offlineMediaOk && (
          <SectionBox title="저장 · 데이터">
            <Field
              title="저장 용량"
              description={OFFLINE_MODE_OPTIONS.find((o) => o.value === offlineStorageMode)?.desc}
            >
              <Segmented value={offlineStorageMode} onChange={handleStorageModeChange} options={OFFLINE_MODE_OPTIONS} />
            </Field>

            <ToggleField
              title="자동 다운로드"
              description="영상 재생 시작 시 자동으로 오프라인 저장합니다."
              checked={autoDownload}
              onChange={() => setAutoDownload(!autoDownload)}
            />

            <Field
              title="저장된 내용"
              description={
                <>
                  {usedBytes != null && usedBytes > 0
                    ? `현재 ${usedBytes >= 1024 * 1024 * 1024 ? `${(usedBytes / (1024 * 1024 * 1024)).toFixed(1)}GB` : `${(usedBytes / (1024 * 1024)).toFixed(0)}MB`} 저장됨 · `
                    : ''}오프라인 저장 미디어와 이어듣기 위치를 모두 삭제합니다.
                </>
              }
            >
              <button
                type="button"
                onClick={handleClearMedia}
                disabled={clearingMedia}
                className="w-full flex items-center justify-between"
                style={{ background: 'transparent' }}
              >
                <span className="text-sm font-medium" style={{ color: clearedMedia ? 'var(--accent-500)' : '#dc2626' }}>
                  {clearedMedia ? '삭제 완료' : clearingMedia ? '삭제 중...' : '저장된 내용 모두 지우기'}
                </span>
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
            </Field>

            <Field title="캐시" description="재생 기록·대기열 등 임시 데이터를 삭제하고 새로고침합니다. 재생목록은 유지됩니다.">
              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearing}
                className="w-full flex items-center justify-between"
                style={{ background: 'transparent' }}
              >
                <span className="text-sm font-medium" style={{ color: cleared ? 'var(--accent-500)' : 'var(--ink-0)' }}>
                  {cleared ? '캐시가 삭제되었습니다' : clearing ? '삭제 중...' : '캐시 삭제'}
                </span>
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
            </Field>
          </SectionBox>
        )}

        {/* ════════════ 정보 ════════════ */}
        <SectionBox title="정보">
          <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
            {[
              { label: '제작', value: '주님의 교회' },
              { label: '앱 버전', value: import.meta.env.VITE_APP_VERSION ? `Selah ${import.meta.env.VITE_APP_VERSION}` : 'BETA' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2.5"
                onClick={label === '앱 버전' ? handleVersionTap : undefined}
              >
                <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>{value}</span>
              </div>
            ))}
          </div>
        </SectionBox>

      </div>
    </div>
  )
}
