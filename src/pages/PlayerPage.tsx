import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getSelahMenu, clearSelahMenu } from '@/lib/selahMenu'
import { useAudio } from '@/contexts/AudioContext'
import { usePlaylistStore } from '@/store/playlistStore'
import PlaylistBottomSheet from '@/components/PlaylistBottomSheet'
import { useSettingsStore } from '@/store/settingsStore'
import type { PlayMode } from '@/store/settingsStore'
import { useRecentStore } from '@/store/recentStore'
import { useQueueStore } from '@/store/queueStore'
import TagBadge from '@/components/TagBadge'
import { saveSermonResume, clearSermonResume } from '@/lib/sermonResume'
import { downloadMedia, isMediaCached, isOfflineMediaSupported } from '@/lib/mediaStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'

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

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}


function AdjacentNav({
  adjacent, hasCtx, onNav,
}: {
  adjacent: Adjacent | undefined
  hasCtx: boolean
  onNav: (target: AdjacentVideo) => void
}) {
  if (!hasCtx || (!adjacent?.prev && !adjacent?.next)) return null

  const Card = ({ video, label, align }: { video: AdjacentVideo; label: string; align: 'left' | 'right' }) => (
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
      <div className="flex-shrink-0 rounded-[6px] overflow-hidden" style={{ width: 72, aspectRatio: '16/9', background: 'var(--surface-2)' }}>
        {video.thumbnail
          ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
      </div>
      {align === 'left' && (
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
          <p className="text-xs font-medium line-clamp-2" style={{ color: 'var(--ink-1)' }}>{video.title}</p>
        </div>
      )}
    </button>
  )

  return (
    <section className="mt-6 pt-5 flex flex-col gap-2" style={{ borderTop: '1px solid var(--divider)' }}>
      {adjacent?.prev && <Card video={adjacent.prev} label="← 이전곡" align="left" />}
      {adjacent?.next && <Card video={adjacent.next} label="다음곡 →" align="right" />}
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

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const playerBase = location.pathname.startsWith('/sermon/player/') ? '/sermon/player' : '/player'
  const handleBack = () => {
    const menu = getSelahMenu()
    clearSelahMenu()
    navigate(menu ?? '/')
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
    currentVideo, isPlaying, isLoading, isEnded, position, duration, autoNextProgress, error,
    playVideo, togglePlay, seek, seekBy, cancelAutoNext, videoSlotRef,
  } = useAudio()
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [imgErr, setImgErr] = useState(false)
  const [dlState, setDlState] = useState<{ key: string | null; status: DownloadStatus }>({ key: null, status: 'idle' })
  const [dlProgress, setDlProgress] = useState(0)
  const downloadingRef = useRef(false)
  const dlStatus = dlState.key === mediaCacheKey ? dlState.status : 'idle'
  const isDownloaded = isCachedInStore || dlStatus === 'done'
  const offlineMediaOk = isOfflineMediaSupported()
  const isDraggingRef = useRef(false)
  const hasPlayedRef = useRef(false)
  const resumePositionRef = useRef(0)
  resumePositionRef.current = position
  const resumeDurationRef = useRef(0)
  resumeDurationRef.current = duration
  const currentVideoRef = useRef(currentVideo)
  currentVideoRef.current = currentVideo

  useEffect(() => {
    setDragValue(null)
    setImgErr(false)
    hasPlayedRef.current = false
  }, [id])

  useEffect(() => {
    setDlProgress(0)
    setDlState({ key: mediaCacheKey, status: 'idle' })
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

  const handleAdjacentNav = useCallback((target: AdjacentVideo) => {
    const idx = queueIds.indexOf(target.id)
    if (idx !== -1) setQueue(queueIds, idx)
    playVideo(
      { id: target.id, title: target.title, thumbnail: target.thumbnail, tag: target.tag, hymnTitle: target.hymnTitle, duration: target.duration, chapter: target.chapter },
      { autoPlay: true, skipRecentAdd: recentMode },
    )
    navigate(`${playerBase}/${target.id}${recentMode ? '?recentMode=1' : ''}`)
  }, [queueIds, setQueue, recentMode, navigate, playVideo])

  const sermonSeek = (location.state as { sermonSeek?: number } | null)?.sermonSeek

  useEffect(() => {
    if (!video) return
    if (hasPlayedRef.current) return
    if (currentVideo?.id !== video.id) {
      hasPlayedRef.current = true
      playVideo(
        { id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag, hymnTitle: video.lyric?.hymnTitle, duration: video.duration, chapter: video.chapter },
        { autoPlay: autoPlayOnDetail, seekTo: sermonSeek },
      )
    }
  }, [autoPlayOnDetail, currentVideo?.id, playVideo, video, sermonSeek])

  // ── sermon resume: 5초마다 저장 ──────────────────────────────
  const sermonStateCategoryId = (location.state as { categoryId?: string } | null)?.categoryId
  const sermonStateCategoryTitle = (location.state as { categoryTitle?: string } | null)?.categoryTitle
  useEffect(() => {
    if (playerBase !== '/sermon/player' || !sermonStateCategoryId) return
    const interval = setInterval(() => {
      const pos = resumePositionRef.current
      const dur = resumeDurationRef.current
      const vid = currentVideoRef.current
      if (pos > 0 && dur > 0 && vid) {
        // 현재 모드 다운로드 완료 여부를 함께 저장 — 팝업은 완료된 경우에만 뜬다.
        const mode = useSettingsStore.getState().mediaMode
        const downloaded = useCachedMediaStore.getState().cachedIds.has(`${vid.id}-${mode}`)
        saveSermonResume({
          videoId: vid.id,
          videoTitle: vid.title,
          categoryId: sermonStateCategoryId,
          categoryTitle: sermonStateCategoryTitle,
          position: pos,
          downloaded,
        })
      }
    }, 5000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerBase, sermonStateCategoryId, sermonStateCategoryTitle])

  // ── sermon resume: 완료 시 삭제 ──────────────────────────────
  useEffect(() => {
    if (isEnded && playerBase === '/sermon/player') {
      clearSermonResume()
    }
  }, [isEnded, playerBase])

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
        }))
        setQueue(ids, idx !== -1 ? idx : 0, metas)
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentMode, id, sermonStateCategoryId])

  const handleDownload = useCallback(async () => {
    if (!id || !video) return
    if (!offlineMediaOk) return
    if (offlineStorageMode === 'thrift') return
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
      const { data } = await api.get<{ url: string; bitrate?: number; duration?: number | null }>(
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
    if (!autoDownload || offlineStorageMode === 'thrift') return
    if (!video || !offlineMediaOk) return
    handleDownload()
  // video?.id로 의존: 백그라운드 refetch(같은 id, 새 ref)로 재발화하지 않도록
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, autoDownload])

  const handleRetry = useCallback(() => {
    if (video) playVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag, hymnTitle: video.lyric?.hymnTitle, duration: video.duration })
  }, [video])

  const progress = dragValue !== null ? dragValue : (duration > 0 ? position / duration : 0)
  const isFav = id ? isInAnyPlaylist(id) : false

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
      {mediaMode === 'video' ? (
        <div ref={videoSlotRef as React.RefObject<HTMLDivElement>} style={{ display: 'block', width: '100%', height: '100%' }} />
      ) : video?.thumbnail && !imgErr ? (
        <img src={video.thumbnail} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--ink-3)' }}>🎵</div>
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

      {error && (
        <div className="mb-4 text-center">
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          <button className="text-sm mt-2 underline" style={{ color: 'var(--primary-700)' }} onClick={handleRetry}>다시 시도</button>
        </div>
      )}

      {/* Seek bar */}
      <div className="mb-2">
        <input
          type="range" min={0} max={1} step={0.001} value={progress}
          onMouseDown={() => { isDraggingRef.current = true }}
          onTouchStart={() => { isDraggingRef.current = true }}
          onChange={(e) => setDragValue(Number(e.target.value))}
          onMouseUp={(e) => { isDraggingRef.current = false; seek((e.target as HTMLInputElement).valueAsNumber * duration); setTimeout(() => setDragValue(null), 300) }}
          onTouchEnd={(e) => { isDraggingRef.current = false; seek((e.target as HTMLInputElement).valueAsNumber * duration); setTimeout(() => setDragValue(null), 300) }}
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

      {/* Playback mode */}
      <div className="relative flex justify-end mt-5">
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
        className="flex items-center justify-between px-2"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <button
          onClick={handleBack}
          className="p-2 flex items-center gap-1"
          style={{ color: 'var(--ink-2)', fontSize: 13 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          돌아가기
        </button>
        <div className="flex items-center gap-2">
          {isDownloaded && (
            <span
              className="flex items-center gap-1 rounded-full"
              style={{
                padding: '5px 8px',
                background: 'rgba(61,107,68,0.12)',
                border: '1px solid rgba(61,107,68,0.22)',
                color: 'var(--primary-700)',
                fontSize: 12,
                fontWeight: 700,
                lineHeight: '16px',
                whiteSpace: 'nowrap',
              }}
              title="다운로드 완료"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M8 11l4 4 4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              완료됨
            </span>
          )}
          {/* 수동 다운로드 트리거 — 미저장(idle) 상태에서만. 진행은 하단 가로 바로 표시 */}
          {id && offlineMediaOk && offlineStorageMode !== 'thrift' && !isDownloaded && dlStatus === 'idle' && (
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
          {id && (
            <button onClick={() => setPlaylistSheetOpen(true)} className="p-2 transition-transform hover:scale-110"
              style={{ fontSize: 20, color: isFav ? 'var(--accent-500)' : 'var(--ink-3)' }}>
              {isFav ? '★' : '☆'}
            </button>
          )}
        </div>
      </header>

      {/* 다운로드 진행 바 — 다운로드 중일 때 전체폭으로 명확히 표시 */}
      {dlStatus === 'downloading' && (
        <div style={{ background: 'var(--primary-50)', borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center justify-between px-4" style={{ height: 30 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-700)' }}>
              {mediaMode === 'video' ? '영상' : '음원'} 저장 중…
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-700)' }}>
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
    </div>
  )
}
