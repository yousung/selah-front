import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { clearSelahMenu } from '@/lib/selahMenu'
import { useAudio } from '@/contexts/AudioContext'
import { usePlaylistStore } from '@/store/playlistStore'
import PlaylistBottomSheet from '@/components/PlaylistBottomSheet'
import { useSettingsStore } from '@/store/settingsStore'
import type { PlayMode } from '@/store/settingsStore'
import { useRecentStore } from '@/store/recentStore'
import { useQueueStore } from '@/store/queueStore'
import TagBadge from '@/components/TagBadge'
import Thumb from '@/components/Thumb'
import SecretThumbPlaceholder from '@/components/SecretThumbPlaceholder'
import { getSermonResume, clearSermonResume, type SermonResumeData } from '@/lib/sermonResume'
import { downloadMedia, isMediaCached, isOfflineMediaSupported, cancelDownload, MEDIA_CORRUPT_EVENT } from '@/lib/mediaStore'
import type { MediaCorruptDetail } from '@/lib/mediaStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { useVolumeBoostStore, VOLUME_BOOST_MIN, VOLUME_BOOST_MAX } from '@/store/volumeBoostStore'
import { fs } from '@/lib/fontScale'
import { shareSongToKakao, shareSermonToKakao } from '@/lib/kakaoShare'
import { isIOS } from '@/lib/platform'
import Toast from '@/components/Toast'

const IOS_BACKGROUND_LIMIT_MESSAGE = '아이폰에서는 부스터·필터 사용 중 백그라운드·잠금화면으로 넘어가면 재생이 정지됩니다.'

interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  duration?: number | null
  chapter?: number | null
  hymnTitle?: string | null
  playlist?: { id: string; title: string }
  lyric?: Lyric | null
  description?: string | null
  isSecret?: boolean | null
  isTemp?: boolean | string | null
}

interface Lyric {
  chapter?: number | null
  reference?: string | null
  hymnTitle?: string | null
  verseCount?: number | null
  verse1?: string | null
  verse2?: string | null
  verse3?: string | null
  verse4?: string | null
  verse5?: string | null
  verse6?: string | null
  verse7?: string | null
  verse8?: string | null
  verse9?: string | null
  verse10?: string | null
  verse11?: string | null
  verse12?: string | null
}

type DownloadStatus = 'idle' | 'downloading' | 'done'

function isTempVideo(isTemp?: boolean | string | null) {
  return isTemp === true || isTemp === 'true'
}

function TempArtworkPlaceholder() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, var(--surface-2) 0%, rgba(61,107,68,0.22) 52%, rgba(201,168,76,0.24) 100%)',
      }}
    >
      <span className="text-xl font-bold select-none" style={{ color: 'var(--primary-800)', letterSpacing: '0.08em' }}>
        임시
      </span>
    </div>
  )
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  const total = Math.floor(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }
  return `${m}:${sec.toString().padStart(2, '0')}`
}


const AdjacentNavCard = React.memo(({ video, label, align, onNav }: { video: AdjacentVideo; label: string; align: 'left' | 'right'; onNav: (target: AdjacentVideo) => void }) => (
  <button
    onClick={() => onNav(video)}
    className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
    style={{ textAlign: align }}
  >
    {align === 'right' && (
      <div className="flex-1 min-w-0">
        <p className="text-[10px] mb-0.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
        <p className="text-xs font-medium line-clamp-2" style={{ color: 'var(--ink-1)' }}>{video.title}</p>
      </div>
    )}
    <div className="relative flex-shrink-0 rounded-[6px] overflow-hidden" style={{ width: 72, aspectRatio: '16/9', background: 'var(--surface-2)' }}>
      <Thumb
        src={video.thumbnail}
        className="w-full h-full object-cover"
        fallback={<div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
      />
    </div>
    {align === 'left' && (
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[10px] mb-0.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
        <p className="text-xs font-medium line-clamp-2" style={{ color: 'var(--ink-1)' }}>{video.title}</p>
      </div>
    )}
  </button>
))

function AdjacentNav({
  adjacent, hasCtx, onNav,
}: {
  adjacent: Adjacent | undefined
  hasCtx: boolean
  onNav: (target: AdjacentVideo) => void
}) {
  if (!hasCtx || (!adjacent?.prev && !adjacent?.next)) return null

  return (
    <section className="mt-6 pt-5 flex flex-col gap-2" style={{ borderTop: '1px solid var(--divider)' }}>
      {adjacent?.prev && <AdjacentNavCard video={adjacent.prev} label="← 이전곡" align="left" onNav={onNav} />}
      {adjacent?.next && <AdjacentNavCard video={adjacent.next} label="다음곡 →" align="right" onNav={onNav} />}
    </section>
  )
}

function LyricsSection({ lyric, isInTab = false }: { lyric?: Lyric | null; isInTab?: boolean }) {
  if (!lyric) return null
  const verses = [
    lyric.verse1, lyric.verse2, lyric.verse3, lyric.verse4,
    lyric.verse5, lyric.verse6, lyric.verse7, lyric.verse8,
    lyric.verse9, lyric.verse10, lyric.verse11, lyric.verse12,
  ].filter(Boolean) as string[]
  if (verses.length === 0) return null

  return (
    <div className={!isInTab ? "mt-8 pt-5" : ""} style={!isInTab ? { borderTop: '1px solid var(--divider)' } : {}}>
      {lyric.hymnTitle && (
        <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--ink-1)' }}>{lyric.hymnTitle}</p>
      )}
      {lyric.reference && (
        <p className="text-xs mb-4 text-center" style={{ color: 'var(--ink-2)' }}>{lyric.reference}</p>
      )}
      <div className="space-y-5">
        {verses.map((v, i) => (
          <div key={i}>
            <p className="text-[11px] font-semibold mb-1 text-center" style={{ color: 'var(--ink-3)' }}>{i + 1}절</p>
            <p className="text-sm leading-[1.9] whitespace-pre-line text-center" style={{ color: 'var(--ink-1)' }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DescriptionSection({ description }: { description?: string | null }) {
  if (!description || description.trim().length === 0) {
    return (
      <div className="mx-auto" style={{ maxWidth: '640px' }}>
        <p className="text-sm leading-[1.9] text-center" style={{ color: 'var(--ink-3)' }}>준비중입니다.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto" style={{ maxWidth: '640px' }}>
      <p className="text-sm leading-[1.9] whitespace-pre-line" style={{ color: 'var(--ink-1)' }}>{description}</p>
    </div>
  )
}

function LyricsDescriptionTabs({ lyric, description }: { lyric?: Lyric | null; description?: string | null }) {
  const hasLyrics = lyric && [
    lyric.verse1, lyric.verse2, lyric.verse3, lyric.verse4,
    lyric.verse5, lyric.verse6, lyric.verse7, lyric.verse8,
    lyric.verse9, lyric.verse10, lyric.verse11, lyric.verse12,
  ].some(Boolean)

  const hasDescription = true

  // If neither, render nothing
  if (!hasLyrics && !hasDescription) return null

  // If only lyrics, render just lyrics without tab bar
  if (hasLyrics && !hasDescription) {
    return (
      <LyricsSection lyric={lyric} isInTab={false} />
    )
  }

  // If only description, render just description without tab bar
  if (!hasLyrics && hasDescription) {
    return (
      <section className="mt-8 pt-5" style={{ borderTop: '1px solid var(--divider)' }}>
        <div className="mx-auto" style={{ maxWidth: '640px' }}>
          <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--ink-1)' }}>해설</p>
          <DescriptionSection description={description} />
        </div>
      </section>
    )
  }

  // Both exist: render tab bar + content
  const [activeTab, setActiveTab] = React.useState<'lyrics' | 'description'>('lyrics')

  return (
    <section className="mt-8 pt-5" style={{ borderTop: '1px solid var(--divider)' }}>
      {/* Tab bar */}
      <div
        role="tablist"
        className="flex items-center justify-center gap-8 mb-6"
        style={{ borderBottom: '1px solid var(--divider)', paddingBottom: 12 }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'lyrics'}
          onClick={() => setActiveTab('lyrics')}
          className="text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'lyrics' ? 'var(--ink-0)' : 'var(--ink-2)',
            borderBottom: activeTab === 'lyrics' ? '2px solid var(--primary-700)' : 'none',
            paddingBottom: 12,
            cursor: 'pointer',
          }}
        >
          가사
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'description'}
          onClick={() => setActiveTab('description')}
          className="text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'description' ? 'var(--ink-0)' : 'var(--ink-2)',
            borderBottom: activeTab === 'description' ? '2px solid var(--primary-700)' : 'none',
            paddingBottom: 12,
            cursor: 'pointer',
          }}
        >
          해설
        </button>
      </div>

      {/* Content */}
      {activeTab === 'lyrics' && (
        <div role="tabpanel" aria-labelledby="tab-lyrics" className="pt-5">
          <LyricsSection lyric={lyric} isInTab={true} />
        </div>
      )}
      {activeTab === 'description' && (
        <div role="tabpanel" aria-labelledby="tab-description" className="pt-5">
          <div className="mx-auto" style={{ maxWidth: '640px' }}>
            <DescriptionSection description={description} />
          </div>
        </div>
      )}
    </section>
  )
}

interface AdjacentVideo {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  chapter: number
  hymnTitle?: string | null
  duration?: number | null
  isSecret?: boolean | null
}

interface Adjacent {
  prev: AdjacentVideo | null
  next: AdjacentVideo | null
  first?: AdjacentVideo | null
}

function PlayModeIcon({ mode }: { mode: PlayMode }) {
  if (mode === 'single') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h12"/><polyline points="13 8 17 12 13 16"/><line x1="20" y1="8" x2="20" y2="16"/>
      </svg>
    )
  }
  if (mode === 'playlist') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="14" y2="6"/><line x1="3" y1="12" x2="14" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/>
        <polyline points="14 15 18 18 14 21"/>
      </svg>
    )
  }
  if (mode === 'loop') {
    // 한곡 반복: repeat 아이콘 + 중앙 "1"
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        <text x="12" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" stroke="none" fill="currentColor">1</text>
      </svg>
    )
  }
  // repeat all
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  )
}

function extractChapter(title: string): number {
  const m = /시편찬송\s*(\d+)장/.exec(title)
  return m ? parseInt(m[1]) : 0
}

/** 볼륨 증폭 아이콘 — 스피커 + 음파 2줄(증폭 시 두 음파 모두 진하게, 보통 시 바깥 음파 흐리게) */
function BoostIcon({ boosted }: { boosted: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5v5h3l4.5 3.5v-12L7 9.5H4z" fill="currentColor" stroke="none" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" opacity={0.95} />
      <path d="M18.3 6.5a8 8 0 0 1 0 11" opacity={boosted ? 0.95 : 0.4} />
    </svg>
  )
}

/**
 * 곡별 볼륨 증폭 컨트롤(수동) — 플레이어 하단 좌측. 오디오 모드에서만 표시된다(비디오 모드는
 * 재생 경로가 달라 증폭이 적용되지 않으므로 아이콘 자체를 숨긴다).
 * 보통(1)이면 흐린 아이콘, 증폭 중이면 primary색 + "N.N배" 라벨. 탭하면 슬라이더 팝오버.
 * 값은 video.id별로 저장(useVolumeBoostStore) — 캐시 삭제에도 보존된다.
 */
function BoostControl({ videoId }: { videoId: string }) {
  const boost = useVolumeBoostStore((s) => s.boosts[videoId] ?? VOLUME_BOOST_MIN)
  const setBoostRaw = useVolumeBoostStore((s) => s.setBoost)
  const [open, setOpen] = useState(false)
  const [showIOSToast, setShowIOSToast] = useState(false)
  const boosted = boost > VOLUME_BOOST_MIN
  const pct = ((boost - VOLUME_BOOST_MIN) / (VOLUME_BOOST_MAX - VOLUME_BOOST_MIN)) * 100

  // 보통(꺼짐) → 증폭(켜짐)으로 처음 넘어가는 순간에만 iOS 안내 토스트를 띄운다(드래그 중 반복 노출 방지).
  const setBoost = useCallback((id: string, v: number) => {
    if (boost <= VOLUME_BOOST_MIN && v > VOLUME_BOOST_MIN && isIOS()) setShowIOSToast(true)
    setBoostRaw(id, v)
  }, [boost, setBoostRaw])

  return (
    <div className="relative">
      {showIOSToast && (
        <Toast message={IOS_BACKGROUND_LIMIT_MESSAGE} onClose={() => setShowIOSToast(false)} />
      )}
      {open && (
        <>
          {/* 외부 탭 시 닫기 */}
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          {/* 팝오버 카드 */}
          <div
            className="absolute bottom-full left-0 mb-3 z-[50] animate-fade-in"
            style={{ width: 'min(264px, calc(100vw - 40px))' }}
          >
            <div
              className="rounded-[14px] px-3.5 py-3"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--divider)', boxShadow: '0 10px 30px rgba(0,0,0,0.16)' }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span style={{ color: 'var(--ink-1)', fontSize: fs(13), fontWeight: 600 }}>볼륨 증폭</span>
                <span style={{ color: boosted ? 'var(--primary-700)' : 'var(--ink-3)', fontSize: fs(14), fontWeight: 700 }}>
                  {boosted ? `${boost.toFixed(1)}배` : '보통'}
                </span>
              </div>
              {/* 슬라이더 (seek바와 동일 오버레이 패턴) */}
              <div className="relative flex items-center" style={{ height: 22 }}>
                <div className="relative w-full" style={{ height: 5, borderRadius: 999, background: 'var(--surface-2)' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, background: 'var(--primary-700)', borderRadius: 999 }} />
                  <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: '50%', background: 'var(--surface-0)', border: '2px solid var(--primary-700)', boxShadow: '0 1px 3px rgba(0,0,0,0.22)' }} />
                  <input
                    type="range" min={VOLUME_BOOST_MIN} max={VOLUME_BOOST_MAX} step={0.1} value={boost}
                    onChange={(e) => setBoost(videoId, Number(e.target.value))}
                    className="absolute inset-0 w-full cursor-pointer"
                    style={{ height: '100%', opacity: 0, margin: 0, padding: 0 }}
                    aria-label="볼륨 증폭 배율"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2.5 flex-wrap">
                <span style={{ color: 'var(--ink-3)', fontSize: fs(11), lineHeight: fs(15) }}>이 곡에만 저장돼요</span>
                <button
                  type="button"
                  onClick={() => setBoost(videoId, VOLUME_BOOST_MIN)}
                  disabled={!boosted}
                  style={{ color: boosted ? 'var(--primary-700)' : 'var(--ink-3)', fontSize: fs(12), fontWeight: 600, opacity: boosted ? 1 : 0.45 }}
                >
                  보통으로
                </button>
              </div>
            </div>
            {/* 버튼을 가리키는 아래 화살표 */}
            <div style={{ position: 'absolute', top: '100%', left: 18, marginTop: -1, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '8px solid var(--surface-0)' }} />
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-70 active:scale-95"
        style={{
          padding: boosted ? '6px 11px 6px 9px' : 8,
          background: boosted ? 'rgba(61,107,68,0.12)' : 'transparent',
          color: boosted ? 'var(--primary-700)' : 'var(--ink-3)',
        }}
        aria-label="볼륨 증폭"
      >
        <BoostIcon boosted={boosted} />
        {boosted && <span style={{ fontSize: fs(12), fontWeight: 700, lineHeight: fs(16) }}>{boost.toFixed(1)}배</span>}
      </button>
    </div>
  )
}

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const playerBase = location.pathname.startsWith('/sermon/player/') ? '/sermon/player' : '/player'
  const isSermonPlayer = playerBase === '/sermon/player'
  const handleBack = () => {
    clearSelahMenu()
    // 히스토리에 돌아갈 곳이 있으면 이전 페이지로(카테고리 등), 없으면(직접 진입/공유링크) 홈으로.
    const canGoBack = (window.history.state?.idx ?? 0) > 0
    if (canGoBack) navigate(-1)
    else navigate('/')
  }
  const [searchParams] = useSearchParams()
  const isInAnyPlaylist = usePlaylistStore((s) => s.isInAnyPlaylist)
  const [playlistSheetOpen, setPlaylistSheetOpen] = useState(false)
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const playMode = useSettingsStore((s) => s.playMode)
  const setPlayMode = useSettingsStore((s) => s.setPlayMode)
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const offlineStorageMode = useSettingsStore((s) => s.offlineStorageMode)
  const autoDownload = useSettingsStore((s) => s.autoDownload)
  const mediaType = mediaMode === 'video' ? 'video' : 'audio'
  const mediaCacheKey = id ? `${id}-${mediaType}` : null
  const isCachedInStore = useCachedMediaStore((s) => !!mediaCacheKey && s.cachedIds.has(mediaCacheKey))
  const {
    currentVideo, isPlaying, isLoading, position, duration, autoNextProgress, error,
    playVideo, togglePlay, seekBy, seekFraction, cancelAutoNext, videoSlotRef,
  } = useAudio()
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [dlState, setDlState] = useState<{ key: string | null; status: DownloadStatus }>({ key: null, status: 'idle' })
  const [dlProgress, setDlProgress] = useState(0)
  // 저장 파일 손상 감지 시 표시할 cacheKey(메시지 + 재다운로드 진행 중). null이면 숨김.
  const [corruptKey, setCorruptKey] = useState<string | null>(null)
  const downloadingRef = useRef(false)
  const dlStatus = dlState.key === mediaCacheKey ? dlState.status : 'idle'
  const isDownloaded = isCachedInStore || dlStatus === 'done'
  const offlineMediaOk = isOfflineMediaSupported()
  const isDraggingRef = useRef(false)
  const dragValueRef = useRef<number | null>(null)
  const hasPlayedRef = useRef(false)
  // 특정 설교 직접 진입 시 "이어서/처음부터" 팝업 상태. pending이 true면 자동재생을 보류한다.
  const [sermonResumeChoice, setSermonResumeChoice] = useState<SermonResumeData | null>(null)
  const sermonResumePendingRef = useRef(false)

  useEffect(() => {
    setDragValue(null)
    hasPlayedRef.current = false
    // 다른 설교로 이동 시 이전 팝업/보류 상태를 초기화(스테일 방지).
    sermonResumePendingRef.current = false
    setSermonResumeChoice(null)
  }, [id])

  useEffect(() => {
    setDlProgress(0)
    setDlState({ key: mediaCacheKey, status: 'idle' })
    setCorruptKey(null)
  }, [mediaCacheKey])

  useEffect(() => {
    let cancelled = false
    setDlState({ key: mediaCacheKey, status: 'idle' })
    if (!id || !offlineMediaOk) return
    // 모드 전환 시 이전 모드의 비동기 결과가 'done'을 덮어쓰지 않도록 취소 플래그 사용
    isMediaCached(id, mediaType).then((cached) => {
      if (!cancelled && cached) setDlState({ key: mediaCacheKey, status: 'done' })
    })
    return () => { cancelled = true }
  }, [id, mediaCacheKey, mediaType, offlineMediaOk])

  useEffect(() => {
    if (isCachedInStore) setDlState({ key: mediaCacheKey, status: 'done' })
  }, [isCachedInStore, mediaCacheKey])

  const [showModeTooltip, setShowModeTooltip] = useState(false)
  const modeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recentItems = useRecentStore((s) => s.items)
  const recentMap = useMemo(() => new Map(recentItems.map(i => [i.id, i])), [recentItems])

  const { data: video } = useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      const { data } = await api.get<Video>(`/videos/${id}`)
      return data
    },
    enabled: !!id,
  })

  const lyric = video?.type === 'SERMON' ? null : (video?.lyric ?? null)

  const recentMode = searchParams.get('recentMode') === '1'

  const queueIds = useQueueStore((s) => s.ids)
  const queueIndex = useQueueStore((s) => s.index)
  const setQueue = useQueueStore((s) => s.setQueue)

  useEffect(() => {
    if (!recentMode || !id || !recentItems.length) return
    const ids = recentItems.map(i => i.id)
    const idx = ids.indexOf(id)
    if (idx === -1) return
    setQueue(ids, idx)
  }, [recentMode, id, recentItems])

  // id(URL)가 바뀔 때만 실행 — queueIds 변경(auto-next 등)에는 반응하지 않음
  useEffect(() => {
    if (recentMode || !id) return
    const { ids, index, setQueue: sq } = useQueueStore.getState()
    if (!ids.length) return
    const idx = ids.indexOf(id)
    if (idx !== -1 && idx !== index) sq(ids, idx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, recentMode])

  // auto-advance URL 동기화: 다음 곡이 재생되면 URL도 해당 곡으로 이동
  useEffect(() => {
    if (recentMode || !currentVideo?.id || currentVideo.id === id) return
    const { ids, index } = useQueueStore.getState()
    // queueStore.index가 현재 재생 중인 곡을 가리킬 때만 navigate (queue-driven)
    if (index < 0 || ids[index] !== currentVideo.id) return
    navigate(`${playerBase}/${currentVideo.id}`, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.id])

  // 포그라운드 복귀 동기화: 잠금화면/백그라운드에서 곡이 넘어가면 위 in-flow effect가
  // 백그라운드 중엔 navigate를 못 해 화면이 이전 곡에 멈춘다. 다시 보이게 될 때
  // 재생 중인 곡과 URL이 다르면 현재 곡으로 맞춘다.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (recentMode || !currentVideo?.id || currentVideo.id === id) return
      navigate(`${playerBase}/${currentVideo.id}`, { replace: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [recentMode, id, currentVideo?.id, navigate, playerBase])

  const prevId = queueIndex > 0 ? queueIds[queueIndex - 1] : undefined
  const nextId = queueIndex >= 0 && queueIndex < queueIds.length - 1 ? queueIds[queueIndex + 1] : undefined
  const firstId = queueIds.length > 1 ? queueIds[0] : undefined

  const { data: prevPreview } = useQuery<AdjacentVideo>({
    queryKey: ['preview', prevId],
    queryFn: async () => { const { data } = await api.get<AdjacentVideo>(`/videos/${prevId}/preview`); return data },
    enabled: !!prevId && !recentMode,
  })

  const { data: nextPreview } = useQuery<AdjacentVideo>({
    queryKey: ['preview', nextId],
    queryFn: async () => { const { data } = await api.get<AdjacentVideo>(`/videos/${nextId}/preview`); return data },
    enabled: !!nextId && !recentMode,
  })

  const { data: firstPreview } = useQuery<AdjacentVideo>({
    queryKey: ['preview', firstId],
    queryFn: async () => { const { data } = await api.get<AdjacentVideo>(`/videos/${firstId}/preview`); return data },
    enabled: playMode === 'repeat' && !nextId && !!firstId && firstId !== id && !recentMode,
  })

  const toRecentAdj = useCallback((itemId: string | undefined): AdjacentVideo | null => {
    if (!itemId) return null
    const item = recentMap.get(itemId)
    return item ? { id: item.id, title: item.title, thumbnail: item.thumbnail, tag: item.tag, chapter: extractChapter(item.title), hymnTitle: item.hymnTitle ?? null, duration: item.duration } : null
  }, [recentMap])

  const playlistId = video?.playlist?.id

  useEffect(() => {
    if (recentMode || !id || !playlistId || (queueIds.length > 0 && queueIds.includes(id))) return
    api.get<{ playlists: { id: string; title: string; thumbnail: string | null; tag: string | null; duration?: number | null }[] }>(`/playlists/${playlistId}/videos?page=1&limit=500&sort=chapterAsc`)
      .then(({ data }) => {
        if (data.playlists.length > 0) {
          const ids = data.playlists.map(p => p.id)
          const idx = ids.indexOf(id)
          const metas = data.playlists.map(p => ({ id: p.id, title: p.title, thumbnail: p.thumbnail, tag: p.tag, hymnTitle: null, duration: p.duration }))
          setQueue(ids, idx !== -1 ? idx : 0, metas)
        }
      })
      .catch(() => {})
  }, [recentMode, id, playlistId, queueIds])

  const queueAdjacent = useMemo<Adjacent | undefined>(() => {
    if (!queueIds.length) return undefined
    const prev = recentMode ? toRecentAdj(prevId) : (prevPreview ?? null)
    const next = recentMode ? toRecentAdj(nextId) : (nextPreview ?? null)
    const first = recentMode ? toRecentAdj(firstId) : (firstPreview ?? null)
    return { prev, next, first }
  }, [prevPreview, nextPreview, firstPreview, queueIds.length, recentMode, prevId, nextId, firstId, toRecentAdj])

  const adjacent = queueAdjacent
  const hasAdjacentCtx = recentMode || queueIds.length > 0

  const sermonStateCategoryId = (location.state as { categoryId?: string } | null)?.categoryId
  const sermonStateCategoryTitle = (location.state as { categoryTitle?: string } | null)?.categoryTitle

  const handleAdjacentNav = useCallback((target: AdjacentVideo) => {
    const idx = queueIds.indexOf(target.id)
    if (idx !== -1) setQueue(queueIds, idx)
    playVideo(
      {
        id: target.id,
        title: target.title,
        thumbnail: target.thumbnail,
        tag: target.tag,
        type: isSermonPlayer ? 'SERMON' : null,
        hymnTitle: isSermonPlayer ? target.title : target.hymnTitle,
        duration: target.duration,
        chapter: target.chapter,
        playerPath: isSermonPlayer ? `/sermon/player/${target.id}` : undefined,
        isSecret: target.isSecret,
        categoryId: isSermonPlayer ? sermonStateCategoryId : undefined,
        categoryTitle: isSermonPlayer ? sermonStateCategoryTitle : undefined,
      },
      { autoPlay: true, skipRecentAdd: recentMode },
    )
    navigate(`${playerBase}/${target.id}${recentMode ? '?recentMode=1' : ''}`)
  }, [isSermonPlayer, playerBase, queueIds, setQueue, recentMode, navigate, playVideo, sermonStateCategoryId, sermonStateCategoryTitle])

  const sermonSeek = (location.state as { sermonSeek?: number } | null)?.sermonSeek

  // ── sermon resume: 저장 위치 있으면 "이어서/처음부터" 팝업(자동재생 보류) ──
  // play effect보다 먼저 선언되어, 같은 커밋에서 pending ref를 먼저 세팅한다.
  // (C 팝업이 sermonSeek를 넘기는 경우는 이미 선택된 것이므로 팝업을 띄우지 않는다.)
  useEffect(() => {
    if (!isSermonPlayer || !video || video.isSecret || sermonSeek != null) return
    if (currentVideo?.id === video.id) return
    const saved = getSermonResume(video.id)
    if (saved && saved.position > 0 && saved.downloaded) {
      sermonResumePendingRef.current = true
      setSermonResumeChoice(saved)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSermonPlayer, video?.id, sermonSeek])

  useEffect(() => {
    if (!video) return
    if (video.isSecret) return
    if (hasPlayedRef.current) return
    if (sermonResumePendingRef.current) return
    if (currentVideo?.id === video.id) {
      hasPlayedRef.current = true
      return
    }
    hasPlayedRef.current = true
    playVideo(
      {
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        tag: video.tag,
        type: isSermonPlayer ? 'SERMON' : video.type ?? null,
        hymnTitle: isSermonPlayer ? video.title : video.lyric?.hymnTitle,
        duration: video.duration,
        chapter: video.chapter,
        playerPath: isSermonPlayer ? `/sermon/player/${video.id}` : undefined,
        isSecret: video.isSecret,
        categoryId: isSermonPlayer ? sermonStateCategoryId : undefined,
        categoryTitle: isSermonPlayer ? sermonStateCategoryTitle : undefined,
      },
      { autoPlay: autoPlayOnDetail, seekTo: sermonSeek },
    )
  }, [autoPlayOnDetail, currentVideo?.id, isSermonPlayer, playVideo, video, sermonSeek, sermonStateCategoryId, sermonStateCategoryTitle])

  const handleSermonResumeContinue = useCallback(() => {
    if (!video || !sermonResumeChoice) return
    sermonResumePendingRef.current = false
    hasPlayedRef.current = true
    playVideo(
      {
        id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag,
        type: 'SERMON', hymnTitle: video.title,
        duration: video.duration, chapter: video.chapter,
        playerPath: `/sermon/player/${video.id}`, isSecret: video.isSecret,
        categoryId: sermonResumeChoice.categoryId ?? sermonStateCategoryId,
        categoryTitle: sermonResumeChoice.categoryTitle ?? sermonStateCategoryTitle,
      },
      { autoPlay: true, seekTo: sermonResumeChoice.position },
    )
    setSermonResumeChoice(null)
  }, [video, sermonResumeChoice, sermonStateCategoryId, sermonStateCategoryTitle, playVideo])

  const handleSermonResumeRestart = useCallback(() => {
    if (!video) return
    clearSermonResume(video.id)
    sermonResumePendingRef.current = false
    hasPlayedRef.current = true
    playVideo(
      {
        id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag,
        type: 'SERMON', hymnTitle: video.title,
        duration: video.duration, chapter: video.chapter,
        playerPath: `/sermon/player/${video.id}`, isSecret: video.isSecret,
        categoryId: sermonResumeChoice?.categoryId ?? sermonStateCategoryId,
        categoryTitle: sermonResumeChoice?.categoryTitle ?? sermonStateCategoryTitle,
      },
      { autoPlay: true, seekTo: 0 },
    )
    setSermonResumeChoice(null)
  }, [video, sermonResumeChoice, sermonStateCategoryId, sermonStateCategoryTitle, playVideo])

  // ── sermon resume: 큐 복원 ───────────────────────────────────
  useEffect(() => {
    if (recentMode || !id || !sermonStateCategoryId) return
    if (queueIds.includes(id)) return
    api.get<{ videos: { id: string; title: string; thumbnail: string | null; tag: string | null; duration?: number | null }[] }>(
      `/sermon-categories/${sermonStateCategoryId}/videos?page=1&limit=500`,
    ).then(({ data }) => {
      if (data.videos.length > 0) {
        const ids = data.videos.map((v) => v.id)
        const idx = ids.indexOf(id)
        const metas = data.videos.map((v) => ({
          id: v.id, title: v.title, thumbnail: v.thumbnail,
          tag: v.tag, type: 'SERMON', hymnTitle: v.title,
          duration: v.duration ?? null,
          playerPath: `/sermon/player/${v.id}`,
          categoryId: sermonStateCategoryId,
          categoryTitle: sermonStateCategoryTitle,
        }))
        setQueue(ids, idx !== -1 ? idx : 0, metas)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentMode, id, sermonStateCategoryId])

  const handleDownload = useCallback(async () => {
    if (!id || !video) return
    if (video.isSecret) return
    if (!offlineMediaOk) return
    // 절약(thrift)도 다운로드-후-재생을 위해 다운로드한다(스트림 직접 재생 안 함).
    // 다운로드 후 enforceStoragePolicy가 현재+최근 곡 2개만 남기고 정리한다.
    // 동기 in-flight 가드: autoDownload가 video ref 변경(React Query 백그라운드 refetch)으로
    // 중복 발화해도 두 번째 호출을 즉시 차단. dlStatus(상태)는 비동기 지연이 있어 가드로 부적합.
    if (downloadingRef.current) return
    downloadingRef.current = true
    try {
      const alreadyCached = await isMediaCached(id, mediaType)
      if (alreadyCached) {
        setDlState({ key: mediaCacheKey, status: 'done' })
        return
      }
      const downloadPath = mediaMode === 'video'
        ? `/videos/${id}/download`
        : `/audios/${id}/download`
      const { data } = await api.get<{ url: string; bitrate?: number; duration?: number | null; mimeType?: string }>(
        downloadPath,
        mediaMode !== 'video' ? { params: { quality: 'high' } } : undefined,
      )
      // 총 크기를 헤더로 알 수 없어(CDN CORS) bitrate×duration으로 추정해 진행률 표시
      const durSec = data.duration ?? video.duration ?? 0
      const estimatedSize = data.bitrate && durSec ? (data.bitrate * durSec) / 8 : undefined
      setDlProgress(0)
      setDlState({ key: mediaCacheKey, status: 'downloading' })
      await downloadMedia(id, data.url, {
        type: mediaType,
        estimatedSize,
        mimeType: data.mimeType,
        onProgress: (p) => setDlProgress(p),
      })
      const success = await isMediaCached(id, mediaType)
      setDlState({ key: mediaCacheKey, status: success ? 'done' : 'idle' })
      if (success) useCachedMediaStore.getState().refresh()
    } catch {
      setDlState({ key: mediaCacheKey, status: 'idle' })
    } finally {
      downloadingRef.current = false
    }
  }, [id, video, offlineMediaOk, offlineStorageMode, mediaMode, mediaType, mediaCacheKey])

  useEffect(() => {
    // 절약(thrift)은 autoDownload 토글과 무관하게 항상 다운로드-후-재생(2곡 보관).
    // 그 외 모드는 autoDownload 켜진 경우에만 자동 다운로드.
    if (offlineStorageMode !== 'thrift' && !autoDownload) return
    if (!video || !offlineMediaOk) return
    if (video.isSecret) return
    handleDownload()
  // video?.id로 의존: 백그라운드 refetch(같은 id, 새 ref)로 재발화하지 않도록
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, autoDownload, offlineStorageMode])

  // 영상에서 벗어날 때(id 변경/언마운트) 진행 중이던 다운로드 취소.
  // 특히 비공개 영상으로 넘어갈 때, 이전 곡 다운로드가 완료되면 그 완료 이벤트로
  // 이전 곡이 다시 재생되던 버그(currentVideo가 비공개로 안 바뀌어 발생)를 막는다.
  useEffect(() => {
    return () => {
      if (downloadingRef.current && id) cancelDownload(id, mediaType)
    }
  }, [id, mediaType])

  const handleRetry = useCallback(() => {
    if (video) {
      playVideo({
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        tag: video.tag,
        type: isSermonPlayer ? 'SERMON' : video.type ?? null,
        hymnTitle: isSermonPlayer ? video.title : video.lyric?.hymnTitle,
        duration: video.duration,
        chapter: video.chapter,
        playerPath: isSermonPlayer ? `/sermon/player/${video.id}` : undefined,
        isSecret: video.isSecret,
        categoryId: isSermonPlayer ? sermonStateCategoryId : undefined,
        categoryTitle: isSermonPlayer ? sermonStateCategoryTitle : undefined,
      })
    }
  }, [isSermonPlayer, playVideo, video, sermonStateCategoryId, sermonStateCategoryTitle])

  // 저장 파일 손상 감지(캐시 재생 후 3초 무진행). AudioContext가 손상 파일을 삭제한 뒤
  // MEDIA_CORRUPT_EVENT를 쏜다 → 메시지 표시 + 재다운로드. 완료 시 AudioContext가 자동 재생,
  // 실패 시 스트림으로 폴백(handleRetry). 어느 경우든 메시지는 해제한다.
  useEffect(() => {
    const onCorrupt = (e: Event) => {
      const detail = (e as CustomEvent<MediaCorruptDetail>).detail
      if (!detail || detail.id !== id || detail.type !== mediaType) return
      setCorruptKey(`${detail.id}-${detail.type}`)
      void (async () => {
        try {
          await handleDownload()
        } finally {
          setCorruptKey(null)
          const ok = await isMediaCached(detail.id, detail.type)
          if (!ok) handleRetry()
        }
      })()
    }
    window.addEventListener(MEDIA_CORRUPT_EVENT, onCorrupt)
    return () => window.removeEventListener(MEDIA_CORRUPT_EVENT, onCorrupt)
  }, [id, mediaType, handleDownload, handleRetry])

  const progress = dragValue !== null ? dragValue : (duration > 0 ? position / duration : 0)
  const isFav = id ? isInAnyPlaylist(id) : false
  const artworkDuration = video?.duration ? fmtTime(video.duration) : null

  /* ── Shared sub-components ── */
  const Artwork = (
    <div
      className="rounded-[20px] overflow-hidden shadow-sm"
      style={{
        position: 'relative',
        aspectRatio: '16/9',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--surface-2)',
        border: '1px solid var(--divider)',
      }}
    >
      {video?.isSecret ? (
        <SecretThumbPlaceholder />
      ) : isTempVideo(video?.isTemp) ? (
        <>
          <TempArtworkPlaceholder />
          {video.chapter != null && (
            <span
              className="absolute top-2 left-2 text-white text-xs font-bold px-2 rounded"
              style={{ background: 'rgba(40,40,40,0.82)', lineHeight: fs(22), letterSpacing: '0.02em' }}
            >
              {video.type === 'SERMON' ? (video.chapter === 0 ? '서론' : video.chapter) : `${video.chapter}장`}
            </span>
          )}
          {artworkDuration && (
            <span
              className="absolute bottom-2 right-2 text-white font-semibold rounded"
              style={{ fontSize: fs(12), background: 'rgba(0,0,0,0.78)', padding: '2px 7px', lineHeight: fs(20) }}
            >
              {artworkDuration}
            </span>
          )}
        </>
      ) : mediaMode === 'video' ? (
        <div ref={videoSlotRef as React.RefObject<HTMLDivElement>} style={{ display: 'block', width: '100%', height: '100%' }} />
      ) : (
        <Thumb
          src={video?.thumbnail}
          className="w-full h-full object-cover"
          fallback={<div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--ink-3)' }}>🎵</div>}
        />
      )}

    </div>
  )

  const Controls = (
    <div className="flex flex-col">
      {/* Title + Tag */}
      <div className="mb-6">
        {video ? (
          <>
            <h1 className="serif text-xl font-medium leading-[1.5] text-center mb-1" style={{ color: 'var(--ink-0)' }}>
              {video.title}
            </h1>
            {video.hymnTitle && (
              <p className="text-sm text-center mb-2" style={{ color: 'var(--ink-2)' }}>{video.hymnTitle}</p>
            )}
            <div className="flex items-center justify-center gap-2">
              {video.tag && <TagBadge tag={video.tag} size="md" />}
              {video.playlist && (
                <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{video.playlist.title}</span>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="h-6 rounded mx-auto" style={{ background: 'var(--surface-2)', width: '70%' }} />
            <div className="h-4 rounded mx-auto" style={{ background: 'var(--surface-2)', width: '40%' }} />
          </div>
        )}
      </div>

      {video?.isSecret && (
        <div className="mb-6 py-4 px-4 rounded-xl text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--divider)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--ink-1)' }}>비공개 영상입니다</p>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>재생할 수 없습니다</p>
        </div>
      )}

      {error && !video?.isSecret && (
        <div className="mb-4 text-center">
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          <button className="text-sm mt-2 underline" style={{ color: 'var(--primary-700)' }} onClick={handleRetry}>다시 시도</button>
        </div>
      )}

      {/* Seek bar + Play controls + Playback mode — 비공개 영상은 숨김 */}
      {!video?.isSecret && <>
      <div className="mb-2">
        <input
          type="range" min={0} max={1} step={0.001} value={progress}
          onMouseDown={() => { isDraggingRef.current = true }}
          onTouchStart={() => { isDraggingRef.current = true }}
          onChange={(e) => { const v = Number(e.target.value); setDragValue(v); dragValueRef.current = v }}
          onMouseUp={(e) => { isDraggingRef.current = false; seekFraction(dragValueRef.current ?? (e.target as HTMLInputElement).valueAsNumber); dragValueRef.current = null; setTimeout(() => setDragValue(null), 300) }}
          onTouchEnd={(e) => { isDraggingRef.current = false; seekFraction(dragValueRef.current ?? (e.target as HTMLInputElement).valueAsNumber); dragValueRef.current = null; setTimeout(() => setDragValue(null), 300) }}
          className="w-full"
          style={{ height: 3, accentColor: 'var(--primary-700)', cursor: 'pointer',
            background: `linear-gradient(to right, var(--primary-700) ${progress * 100}%, var(--divider) ${progress * 100}%)` }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>{fmtTime(position)}</span>
          <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Play controls */}
      <div className="flex items-center justify-center gap-5 mt-4">
        {/* 이전곡 */}
        <button
          onClick={() => adjacent?.prev && handleAdjacentNav(adjacent.prev)}
          disabled={!adjacent?.prev}
          className="flex items-center justify-center transition-opacity active:scale-95"
          style={{ color: adjacent?.prev ? 'var(--ink-1)' : 'var(--ink-3)', opacity: adjacent?.prev ? 1 : 0.3, width: 36, height: 36 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        {/* -15s */}
        <button
          onClick={() => seekBy(-15)}
          className="transition-opacity hover:opacity-60 active:scale-95"
        >
          <div className="relative flex items-center justify-center" style={{ width: 40, height: 40 }}>
            <svg width="40" height="40" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" style={{ color: 'var(--ink-1)' }}>
              <path d="M22 8 A14 14 0 1 0 36 22" />
              <polyline points="17,4 22,8 18,13" />
            </svg>
            <span className="absolute text-[10px] font-bold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.5px' }}>15</span>
          </div>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay} disabled={isLoading && !currentVideo}
          className="flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{ width: 68, height: 68, background: 'var(--primary-700)', color: 'var(--white)', boxShadow: '0 4px 20px rgba(61,107,68,0.30)' }}
        >
          {isLoading ? (
            <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5v14l11-7L9 5z" /></svg>
          )}
        </button>

        {/* +15s */}
        <button
          onClick={() => seekBy(15)}
          className="transition-opacity hover:opacity-60 active:scale-95"
        >
          <div className="relative flex items-center justify-center" style={{ width: 40, height: 40 }}>
            <svg width="40" height="40" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" style={{ color: 'var(--ink-1)' }}>
              <path d="M22 8 A14 14 0 1 1 8 22" />
              <polyline points="27,4 22,8 26,13" />
            </svg>
            <span className="absolute text-[10px] font-bold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.5px' }}>15</span>
          </div>
        </button>

        {/* 다음곡 */}
        <button
          onClick={() => {
            const target = adjacent?.next ?? (playMode === 'repeat' ? adjacent?.first : null)
            if (target) handleAdjacentNav(target)
          }}
          disabled={!adjacent?.next && !(playMode === 'repeat' && adjacent?.first)}
          className="flex items-center justify-center transition-opacity active:scale-95"
          style={{
            color: (adjacent?.next || (playMode === 'repeat' && adjacent?.first)) ? 'var(--ink-1)' : 'var(--ink-3)',
            opacity: (adjacent?.next || (playMode === 'repeat' && adjacent?.first)) ? 1 : 0.3,
            width: 36, height: 36,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
          </svg>
        </button>
      </div>

      {/* 볼륨 증폭(좌, 오디오 모드에서만) / 재생 모드(우) */}
      <div className="relative flex justify-between items-center mt-5">
        {mediaMode === 'audio' && id ? <BoostControl videoId={id} /> : <span />}
        {showModeTooltip && (
          <div
            className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 rounded-[6px] text-xs font-medium whitespace-nowrap pointer-events-none"
            style={{ background: 'var(--ink-0)', color: 'var(--surface-0)', zIndex: 10 }}
          >
            {playMode === 'single' ? '1곡 재생' : playMode === 'playlist' ? '플레이리스트 1회' : playMode === 'loop' ? '한곡 반복' : '플레이리스트 반복'}
          </div>
        )}
        <button
          onClick={() => {
            const modes: PlayMode[] = ['single', 'playlist', 'loop', 'repeat']
            setPlayMode(modes[(modes.indexOf(playMode) + 1) % modes.length])
            setShowModeTooltip(true)
            if (modeTooltipTimerRef.current) clearTimeout(modeTooltipTimerRef.current)
            modeTooltipTimerRef.current = setTimeout(() => setShowModeTooltip(false), 1500)
          }}
          className="p-2 rounded-full transition-opacity hover:opacity-70 active:scale-95"
          style={{ color: playMode !== 'single' ? 'var(--primary-700)' : 'var(--ink-3)' }}
        >
          <PlayModeIcon mode={playMode} />
        </button>
      </div>
      </>}
    </div>
  )

  return (
    <div className="flex flex-col min-h-dvh animate-fade-in" style={{ background: 'var(--surface-0)' }}>
      {/* Auto-next progress bar */}
      {autoNextProgress !== null && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] cursor-pointer"
          style={{ height: 3, background: 'var(--divider)' }}
          onClick={cancelAutoNext}
          title="탭하여 취소"
        >
          <div style={{
            height: '100%',
            width: `${autoNextProgress * 100}%`,
            background: 'var(--primary-700)',
            transition: 'width 28ms linear',
          }} />
        </div>
      )}
      {/* AppBar */}
      <header
        className="flex items-center justify-between px-2 safe-top"
        style={{ minHeight: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <button
          onClick={handleBack}
          className="p-2 flex items-center gap-1"
          style={{ color: 'var(--ink-2)', fontSize: fs(13) }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          돌아가기
        </button>
        <div className="flex items-center gap-2">
          {isDownloaded && !video?.isSecret && (
            <span
              className="flex items-center gap-1 rounded-full"
              style={{
                padding: '5px 8px',
                background: 'rgba(61,107,68,0.12)',
                border: '1px solid rgba(61,107,68,0.22)',
                color: 'var(--primary-700)',
                fontSize: fs(12),
                fontWeight: 700,
                lineHeight: fs(16),
                whiteSpace: 'nowrap',
              }}
              title="저장됨"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M8 11l4 4 4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              저장됨
            </span>
          )}
          {/* 수동 다운로드 트리거 — 미저장(idle) 상태에서만. 진행은 하단 가로 바로 표시 */}
          {id && offlineMediaOk && offlineStorageMode !== 'thrift' && !isDownloaded && dlStatus === 'idle' && !video?.isSecret && (
            <button
              onClick={handleDownload}
              className="transition-opacity active:opacity-60 flex items-center p-2"
              style={{ color: 'var(--ink-3)' }}
              title="오프라인 저장"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M8 11l4 4 4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </button>
          )}
          {id && video && (
            <button
              onClick={() => isSermonPlayer
                ? shareSermonToKakao({ id, title: video.title, thumbnail: video.thumbnail, description: video.description ?? undefined })
                : shareSongToKakao({ id, title: video.title, thumbnail: video.thumbnail, description: video.description ?? undefined })}
              className="p-2 transition-transform hover:scale-110"
              style={{ color: 'var(--ink-3)' }}
              aria-label="카카오톡 공유"
              title="카카오톡 공유"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3C6.99 3 3 6.13 3 9.99c0 2.46 1.63 4.62 4.08 5.84-.18.63-.65 2.28-.74 2.64-.12.45.16.45.34.33.14-.1 2.27-1.54 3.19-2.17.36.05.74.08 1.13.08 5.01 0 9-3.13 9-6.99S17.01 3 12 3z"/>
              </svg>
            </button>
          )}
          {id && (
            <button onClick={() => setPlaylistSheetOpen(true)} className="p-2 transition-transform hover:scale-110"
              style={{ fontSize: 20, color: isFav ? 'var(--accent-500)' : 'var(--ink-3)' }}>
              {isFav ? '★' : '☆'}
            </button>
          )}
        </div>
      </header>

      {/* 저장 파일 손상 안내 — 재다운로드 진행은 아래 진행 바로 표시 */}
      {corruptKey === mediaCacheKey && (
        <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center px-4" style={{ minHeight: 30 }}>
            <span style={{ fontSize: fs(12), fontWeight: 600, color: 'var(--error)', lineHeight: 1.4 }}>
              파일이 손상되어 재 다운로드합니다
            </span>
          </div>
        </div>
      )}

      {/* 다운로드 진행 바 — 다운로드 중일 때 전체폭으로 명확히 표시 */}
      {dlStatus === 'downloading' && (
        <div style={{ background: 'var(--primary-50)', borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center justify-between px-4" style={{ minHeight: 30 }}>
            <span style={{ fontSize: fs(12), fontWeight: 600, color: 'var(--primary-700)' }}>
              {mediaMode === 'video' ? '영상' : '음원'} 저장 중…
            </span>
            <span style={{ fontSize: fs(12), fontWeight: 700, color: 'var(--primary-700)' }}>
              {dlProgress < 0.01 ? '' : `${Math.round(dlProgress * 100)}%`}
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--divider)' }}>
            <div style={{
              height: '100%',
              width: dlProgress < 0.01 ? '15%' : `${Math.min(100, dlProgress * 100)}%`,
              background: 'var(--primary-700)',
              transition: 'width 0.25s linear',
              animation: dlProgress < 0.01 ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }} />
          </div>
        </div>
      )}

      {/* Unified layout: single column on mobile, two columns on desktop */}
      <div className="flex-1 px-6 pt-6 pb-8 lg:px-16 lg:py-12" style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">
          <div className="w-full lg:flex-1 mb-8 lg:mb-0">{Artwork}</div>
          <div className="w-full lg:flex-1">{Controls}</div>
        </div>
        <LyricsDescriptionTabs lyric={lyric} description={video?.description} />
        <AdjacentNav adjacent={adjacent} hasCtx={hasAdjacentCtx} onNav={handleAdjacentNav} />
      </div>
      {playlistSheetOpen && id && (
        <PlaylistBottomSheet
          videoId={id}
          videoTitle={video?.title ?? ''}
          videoThumbnail={video?.thumbnail ?? null}
          videoTag={video?.tag ?? null}
          videoHymnTitle={video?.lyric?.hymnTitle ?? null}
          videoDuration={video?.duration ?? null}
          onClose={() => setPlaylistSheetOpen(false)}
        />
      )}

      {/* 설교 직접 진입 시 "이어서 / 처음부터" 선택 팝업 — 배경 탭으로 닫히지 않음(선택 강제) */}
      {sermonResumeChoice && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--white)',
              borderRadius: 20,
              padding: '28px 24px 24px',
            }}
          >
            <p style={{ fontSize: fs(13), fontWeight: 600, color: 'var(--primary-700)', marginBottom: 4 }}>이어서 듣기</p>
            <p style={{ fontSize: fs(15), fontWeight: 700, color: 'var(--ink-0)', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {sermonResumeChoice.videoTitle}
            </p>
            <p style={{ fontSize: fs(13), color: 'var(--ink-3)', marginBottom: 22 }}>
              {fmtTime(Math.floor(sermonResumeChoice.position))}까지 들으셨어요
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleSermonResumeContinue}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--primary-700)', color: 'var(--white)',
                  borderRadius: 12, fontSize: fs(15), fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                }}
              >
                이어서 듣기
              </button>
              <button
                onClick={handleSermonResumeRestart}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--surface-1)', color: 'var(--ink-1)',
                  borderRadius: 12, fontSize: fs(15), fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                }}
              >
                처음부터 다시 듣기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
