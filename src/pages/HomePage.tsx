import { useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef, useCallback } from 'react'
import { isSearchable } from '@/lib/searchable'

function useGridLimit() {
  const [limit, setLimit] = useState(() => {
    const w = window.innerWidth
    if (w >= 1024) return 8
    if (w >= 768) return 6
    return 4
  })
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1024) setLimit(8)
      else if (w >= 768) setLimit(6)
      else setLimit(4)
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return limit
}
import { api } from '@/lib/api'
import { setSelahMenu } from '@/lib/selahMenu'
import { useSettingsStore } from '@/store/settingsStore'
import { useQueueStore } from '@/store/queueStore'
import VideoCard from '@/components/VideoCard'
import { useAudio } from '@/contexts/AudioContext'


interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  chapter?: number | null
  hymnTitle?: string | null
  publishedAt?: string | null
  createdAt?: string | null
  duration?: number | null
}

interface PlaylistMeta {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  duration?: number | null
}

interface Playlist {
  id: string
  title: string
  videos: Video[]
  playlists?: PlaylistMeta[]
}

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

interface BibleVerse {
  id: string
  content: string
  reference: string
}

const VERSE_CACHE_KEY = 'daily-verse-cache'

function getCachedVerse(): BibleVerse | null {
  try {
    const raw = localStorage.getItem(VERSE_CACHE_KEY)
    if (!raw) return null
    const { verse, savedAt } = JSON.parse(raw) as { verse: BibleVerse; savedAt: number }
    if (Date.now() - savedAt > 24 * 60 * 60 * 1000) return null
    return verse
  } catch {
    return null
  }
}

function setCachedVerse(verse: BibleVerse) {
  localStorage.setItem(VERSE_CACHE_KEY, JSON.stringify({ verse, savedAt: Date.now() }))
}

function useDailyVerse() {
  return useQuery<BibleVerse | null>({
    queryKey: ['bible-verse-random'],
    queryFn: async () => {
      const cached = getCachedVerse()
      if (cached) return cached
      const { data } = await api.get<BibleVerse | null>('/bible-verses/random')
      if (data) setCachedVerse(data)
      return data
    },
    staleTime: Infinity,
  })
}

function usePlaylists(limit: number) {
  return useQuery({
    queryKey: ['playlists', limit],
    queryFn: async () => {
      const { data } = await api.get<Playlist[]>('/playlists', { params: { limit } })
      return data
    },
  })
}

function useRecentPlaylist(limit: number) {
  return useQuery({
    queryKey: ['playlists-recent', limit],
    queryFn: async () => {
      const { data } = await api.get<Playlist>('/playlists/recent', { params: { limit } })
      return data
    },
  })
}

function PlaylistSection({ playlist, subtitle: subtitleOverride }: { playlist: Playlist; subtitle?: string }) {
  const navigate = useNavigate()
  const { playVideo, currentVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const setQueue = useQueueStore((s) => s.setQueue)

  const handlePlay = (v: Video) => {
    setSelahMenu('/')
    if (currentVideo?.id === v.id) {
      navigate(`/player/${v.id}`)
      return
    }
    const allItems = playlist.playlists ?? []
    const allIds = allItems.map(p => p.id)
    const idx = allIds.indexOf(v.id)
    const allVideos = allItems.map(p => ({
      id: p.id,
      title: p.title,
      thumbnail: p.thumbnail,
      tag: p.tag,
      hymnTitle: null as string | null,
      duration: p.duration,
    }))
    setQueue(allIds, idx, allVideos)
    playVideo(
      { id: v.id, title: v.title, thumbnail: v.thumbnail, tag: v.tag, chapter: v.chapter, hymnTitle: v.hymnTitle, duration: v.duration },
      { autoPlay: autoPlayOnDetail },
    )
    navigate(`/player/${v.id}`)
  }

  if (!playlist.videos.length) return null

  const today = new Date()
  const subtitle = subtitleOverride ?? `${today.getMonth() + 1}월 ${today.getDate()}일 최근 찬양`

  return (
    <section className="mb-8 animate-fade-up">
      <div className="px-4 mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)', fontFamily: 'var(--font-serif)' }}>{playlist.title}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{subtitle}</p>
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
        {playlist.videos.map((v) => (
          <VideoCard key={v.id} video={v} onClick={() => handlePlay(v)} layout="card" />
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { playVideo, currentVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const limit = useGridLimit()
  const { data: playlists, isLoading } = usePlaylists(limit)
  const { data: recentPlaylist } = useRecentPlaylist(limit)
  const { data: dailyVerse } = useDailyVerse()


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
    queryKey: ['home-search', debouncedQuery],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_LIMIT),
        sort: 'chapterAsc',
        search: debouncedQuery,
        searchField: 'titleChapter',
        excludeTag: 'SERMON',
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

  const handleSearchPlay = (v: Video) => {
    setSelahMenu('/')
    if (currentVideo?.id === v.id) {
      navigate(`/player/${v.id}`)
      return
    }
    playVideo(
      { id: v.id, title: v.title, thumbnail: v.thumbnail, tag: v.tag, chapter: v.chapter, hymnTitle: v.hymnTitle, duration: v.duration },
      { autoPlay: autoPlayOnDetail },
    )
    navigate(`/player/${v.id}`)
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 16 }}>
      {/* AppBar */}
      <header
        className="sticky top-0 z-10"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center px-4" style={{ height: 56 }}>
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
                height: 34,
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
                <VideoCard key={v.id} video={v} onClick={() => handleSearchPlay(v)} layout="list" highlight={debouncedQuery} />
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
          {/* Hero */}
          {dailyVerse && (
            <div className="px-4 pt-5 pb-5">
              <blockquote
                className="font-bold leading-[1.45] whitespace-pre-line"
                style={{ color: 'var(--ink-0)', fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 5vw, 28px)' }}
              >
                {dailyVerse.content}
              </blockquote>
              <p className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>{dailyVerse.reference}</p>
            </div>
          )}

          {/* Notification strip — 오늘 등록 영상 있을 때만 노출 */}
          {hasVideoToday(playlists) && (
            <div className="mx-4 mb-5 px-4 py-3 rounded-[10px]" style={{ background: 'var(--surface-1)' }}>
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
                  <PlaylistSection playlist={recentPlaylist} subtitle="최근 7일 내 등록된 찬양" />
                )}
                {playlists.map((pl) => <PlaylistSection key={pl.id} playlist={pl} />)}
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
    </div>
  )
}
