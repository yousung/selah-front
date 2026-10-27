import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef, useCallback } from 'react'
import { isSearchable } from '@/lib/searchable'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/store/settingsStore'
import VideoCard from '@/components/VideoCard'
import FestivalYearChips from '@/components/FestivalYearChips'
import { useBulkDownload, type BulkDownload } from '@/lib/useBulkDownload'
import { BulkDownloadToggle, BulkSelectMark, BulkDownloadOverlay } from '@/components/BulkDownload'
import {
  useGridLimit,
  useFestivals,
  useFestival,
  toFestivalPlaylist,
  usePlaylists,
  useRecentPlaylist,
  usePlayHymn,
  type HymnVideo as Video,
  type HymnPlaylist as Playlist,
} from '@/lib/hymnPlaylists'

interface VideoPage {
  videos: Video[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  playlists: string[]
}

const PAGE_LIMIT = 20

function hasVideoToday(playlists?: Playlist[]): boolean {
  if (!playlists?.length) return false
  const now = new Date()
  const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate()
  return playlists.some((pl) =>
    pl.videos.some((v) => {
      const raw = v.createdAt ?? v.publishedAt
      if (!raw) return false
      const dt = new Date(raw)
      return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d
    }),
  )
}

/** 목록 카드 + 선택 모드 체크 표시. 선택 모드에선 탭이 선택 토글이 된다(저장됨/비공개/방송중은 무반응). */
function HymnCard({ video, bulk, onPlay, layout, highlight }: {
  video: Video; bulk: BulkDownload; onPlay: () => void; layout: 'card' | 'list'; highlight?: string
}) {
  const pick = bulk.pickable(video)
  return (
    <div style={{ position: 'relative' }}>
      <VideoCard
        video={video}
        layout={layout}
        highlight={highlight}
        isDownloading={bulk.downloadingIds.has(video.id)}
        selectMode={bulk.selectMode}
        onClick={bulk.selectMode ? () => { if (pick) bulk.toggleSelect(video.id) } : onPlay}
      />
      {bulk.selectMode && pick && (
        <BulkSelectMark
          selected={bulk.selected.has(video.id)}
          style={layout === 'card' ? { right: 8, top: 8, transform: 'none' } : undefined}
        />
      )}
    </div>
  )
}

function PlaylistSection({ playlist, subtitle, bulk }: { playlist: Playlist; subtitle?: string; bulk: BulkDownload }) {
  const navigate = useNavigate()
  const playHymn = usePlayHymn()

  const visibleVideos = playlist.videos

  const handlePlay = (v: Video) => playHymn(v, playlist)

  if (!visibleVideos.length) return null

  return (
    <section className="mb-8 animate-fade-up">
      <div className="px-4 mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)', fontFamily: 'var(--font-serif)' }}>{playlist.title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{subtitle}</p>}
        </div>
        <button
          className="text-sm mt-0.5"
          style={{ color: 'var(--ink-2)', flexShrink: 0 }}
          onClick={() => navigate(`/playlist/${playlist.id}`)}
        >
          더보기 &gt;
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
        {visibleVideos.map((v) => (
          <HymnCard key={v.id} video={v} bulk={bulk} onPlay={() => handlePlay(v)} layout="card" />
        ))}
      </div>
    </section>
  )
}

/** 시편 찬송 모임 — 최신 연도 기본, 연도 칩으로 전환. 그리드는 limit개만, 큐는 그해 전체. 목록이 비었거나 에러면 섹션 숨김 */
function FestivalSection({ limit, bulk, festivals, year, playlist, onYearChange }: {
  limit: number
  bulk: BulkDownload
  festivals: NonNullable<ReturnType<typeof useFestivals>['data']> | undefined
  year: number | undefined
  playlist: Playlist | null
  onYearChange: (y: number) => void
}) {
  const navigate = useNavigate()
  const playHymn = usePlayHymn()

  if (!festivals?.length || year == null) return null

  return (
    <section className="mb-8 animate-fade-up">
      <div className="px-4 mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)', fontFamily: 'var(--font-serif)' }}>시편 찬송 모임</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{year} 시편 찬송 모임 팀별 찬양</p>
        </div>
        <button
          className="text-sm mt-0.5"
          style={{ color: 'var(--ink-2)', flexShrink: 0 }}
          onClick={() => navigate(`/festival/${year}`)}
        >
          더보기 &gt;
        </button>
      </div>
      <div className="px-4 mb-3">
        <FestivalYearChips festivals={festivals} year={year} onChange={onYearChange} />
      </div>
      {playlist && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
          {playlist.videos.slice(0, limit).map((v) => (
            <HymnCard key={v.id} video={v} bulk={bulk} onPlay={() => playHymn(v, playlist)} layout="card" />
          ))}
        </div>
      )}
    </section>
  )
}

export default function HymnPage() {
  const playHymn = usePlayHymn()
  const onlyOurChurch = useSettingsStore((s) => s.onlyOurChurch)
  const limit = useGridLimit()
  const bulk = useBulkDownload()
  const { data: playlists, isLoading } = usePlaylists(limit, onlyOurChurch)
  const { data: recentPlaylist } = useRecentPlaylist(limit, onlyOurChurch)
  const { data: festivals } = useFestivals()
  const [selectedYear, setSelectedYear] = useState<number>()
  const festivalYear = selectedYear ?? festivals?.[0]?.year
  const { data: festival } = useFestival(festivalYear)
  const festivalPlaylist = festival ? toFestivalPlaylist(festival) : null


  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleSearchChange = useCallback((v: string) => {
    setSearchQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(v.trim()), 300)
  }, [])

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<VideoPage>({
    queryKey: ['home-search', debouncedQuery, onlyOurChurch],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_LIMIT),
        sort: 'chapterAsc',
        search: debouncedQuery,
        searchField: 'titleChapter',
        excludeTag: 'SERMON',
        excludeTemp: String(onlyOurChurch),
      })
      const { data } = await api.get<VideoPage>(`/videos?${params}`)
      return data
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: isSearchable(debouncedQuery),
  })

  const searchVideos = searchData?.pages.flatMap((p) => p.videos) ?? []

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          observer.disconnect()
          fetchNextPage()
        }
      },
      { threshold: 0, rootMargin: '0px 0px 100px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, searchVideos.length])

  const handleSearchPlay = (v: Video) => playHymn(v)

  // 일괄 다운로드 대상 = 지금 화면에 보이는 곡(중복 제거)
  const visibleVideos = debouncedQuery
    ? searchVideos
    : [...(recentPlaylist?.videos ?? []), ...(playlists?.flatMap((pl) => pl.videos) ?? []), ...(festivalPlaylist?.videos.slice(0, limit) ?? [])]
  const selectableIds = Array.from(new Set(visibleVideos.filter(bulk.pickable).map((v) => v.id)))

  return (
    <div className="animate-fade-in" style={{ paddingBottom: bulk.selectMode ? 80 : 16 }}>
      {/* AppBar */}
      <header
        className="sticky top-0 z-10 safe-top"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center px-4" style={{ minHeight: 56 }}>
          <div className="flex-shrink-0 lg:hidden">
            <p className="text-[11px] font-medium tracking-wider" style={{ color: 'var(--ink-2)' }}>주님의 교회</p>
            <p className="text-base font-bold leading-tight" style={{ color: 'var(--primary-700)' }}>셀라</p>
          </div>
          {/* Search input */}
          <div className="relative flex-1 ml-4 lg:ml-0">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              style={{ color: 'var(--ink-3)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="제목 또는 장 검색 (예: 영광, 10)"
              className="w-full text-sm outline-none pl-8 pr-7"
              style={{
                minHeight: 34,
                background: 'var(--surface-1)',
                border: '1px solid var(--divider)',
                borderRadius: 8,
                color: 'var(--ink-0)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-500)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--divider)')}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full"
                style={{ background: 'var(--ink-3)', color: 'var(--white)', fontSize: 9 }}
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex-shrink-0 ml-3"><BulkDownloadToggle bulk={bulk} /></div>
        </div>
      </header>

      {debouncedQuery ? (
        /* ── Search Results ── */
        <div>
          {searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </div>
          ) : searchVideos.length ? (
            <>
              {searchVideos.map((v) => (
                <HymnCard key={v.id} video={v} bulk={bulk} onPlay={() => handleSearchPlay(v)} layout="list" highlight={debouncedQuery} />
              ))}
              <div ref={sentinelRef} className="h-1" />
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
              ) : !hasNextPage ? (
                <div className="flex items-center justify-center py-6">
                  <p className="text-xs" style={{ color: 'var(--ink-2)' }}>모두 불러왔습니다</p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center py-20">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--ink-3)', marginBottom: 12 }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>"{debouncedQuery}"에 맞는 곡이 없어요.</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Home Feed ── */
        <>
          {/* Notification strip — 오늘 등록 영상 있을 때만 노출 */}
          {hasVideoToday(playlists) && (
            <div className="mx-4 mt-5 mb-5 px-4 py-3 rounded-[10px]" style={{ background: 'var(--surface-1)' }}>
              <p className="text-sm" style={{ color: 'var(--ink-1)' }}>
                <span style={{ color: '#C9A84C', marginRight: 6 }}>●</span>
                오늘 묵상할 영상이 새로 등록되어 있어요.
              </p>
            </div>
          )}

          {/* Feed */}
          <div className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
            ) : playlists?.length ? (
              <>
                {recentPlaylist && recentPlaylist.videos.length > 0 && (
                  <PlaylistSection playlist={recentPlaylist} subtitle="최근 7일 내 등록된 찬양" bulk={bulk} />
                )}
                {playlists.map((pl) => <PlaylistSection key={pl.id} playlist={pl} bulk={bulk} />)}
                <FestivalSection limit={limit} bulk={bulk} festivals={festivals} year={festivalYear} playlist={festivalPlaylist} onYearChange={setSelectedYear} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <span className="text-4xl mb-4">📭</span>
                <p className="text-base font-medium" style={{ color: 'var(--ink-1)' }}>아직 등록된 영상이 없어요.</p>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>곧 콘텐츠가 채워질 거예요.</p>
              </div>
            )}
          </div>
        </>
      )}
      <BulkDownloadOverlay bulk={bulk} selectableIds={selectableIds} />
    </div>
  )
}
