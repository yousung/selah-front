import { useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/store/settingsStore'
import VideoCard from '@/components/VideoCard'
import { useAudio } from '@/contexts/AudioContext'

function useGridLimit() {
  const [limit, setLimit] = useState(() => {
    const w = window.innerWidth
    if (w >= 1024) return 8
    if (w >= 768)  return 6
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

interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  publishedAt?: string | null
  duration?: number | null
}

interface Playlist {
  id: string
  title: string
}

interface VideoPage {
  videos: Video[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

const PAGE_LIMIT = 20

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

function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data } = await api.get<Playlist[]>('/playlists')
      return data
    },
  })
}

function usePlaylistVideos(playlistId: string, limit: number) {
  return useQuery({
    queryKey: ['videos', { playlistId, limit }],
    queryFn: async () => {
      const { data } = await api.get<Video[]>('/videos', { params: { playlistId, limit } })
      return data
    },
  })
}

function PlaylistSection({ playlist, limit }: { playlist: Playlist; limit: number }) {
  const navigate = useNavigate()
  const { playVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const { data: videos, isLoading } = usePlaylistVideos(playlist.id, limit)

  const handlePlay = (v: Video) => {
    playVideo(
      { id: v.id, title: v.title, thumbnail: v.thumbnail, tag: v.tag },
      { autoPlay: autoPlayOnDetail },
    )
    navigate(`/player/${v.id}?playlistId=${playlist.id}&sort=newest`)
  }

  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="px-4 mb-3 flex items-center justify-between">
          <div className="h-5 w-20 rounded" style={{ background: 'var(--surface-2)' }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-[10px] overflow-hidden" style={{ background: 'var(--surface-1)' }}>
              <div style={{ aspectRatio: '16/9', background: 'var(--surface-2)' }} />
              <div className="pt-2 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--surface-2)' }} />
                <div className="h-3 w-2/3 rounded" style={{ background: 'var(--surface-2)' }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!videos?.length) return null

  const today = new Date()
  const subtitle = `${today.getMonth() + 1}월 ${today.getDate()}일 최근 찬양`

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
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} onClick={() => handlePlay(v)} layout="card" />
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { playVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const { data: playlists, isLoading } = usePlaylists()
  const { data: dailyVerse } = useDailyVerse()
  const limit = useGridLimit()

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
        sort: 'newest',
        search: debouncedQuery,
      })
      const { data } = await api.get<VideoPage>(`/videos?${params}`)
      return data
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!debouncedQuery,
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
    playVideo(
      { id: v.id, title: v.title, thumbnail: v.thumbnail, tag: v.tag },
      { autoPlay: autoPlayOnDetail },
    )
    const ctx = new URLSearchParams({ sort: 'newest', search: debouncedQuery })
    navigate(`/player/${v.id}?${ctx}`)
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 16 }}>
      {/* AppBar */}
      <header
        className="sticky top-0 z-10 lg:hidden"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center px-4" style={{ height: 56 }}>
          <div className="flex-shrink-0">
            <p className="text-[11px] font-medium tracking-wider" style={{ color: 'var(--ink-2)' }}>주님의 교회</p>
            <p className="text-base font-bold leading-tight" style={{ color: 'var(--primary-700)' }}>셀라</p>
          </div>
          {/* Search input */}
          <div className="relative flex-1 ml-4">
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
              placeholder="찬양 제목 검색"
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
                <VideoCard key={v.id} video={v} onClick={() => handleSearchPlay(v)} layout="list" />
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
                className="text-[28px] font-bold leading-[1.45] whitespace-pre-line"
                style={{ color: 'var(--ink-0)', fontFamily: 'var(--font-serif)' }}
              >
                {dailyVerse.content}
              </blockquote>
              <p className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>{dailyVerse.reference}</p>
            </div>
          )}

          {/* Notification strip */}
          <div className="mx-4 mb-5 px-4 py-3 rounded-[10px]" style={{ background: 'var(--surface-1)' }}>
            <p className="text-sm" style={{ color: 'var(--ink-1)' }}>
              <span style={{ color: '#C9A84C', marginRight: 6 }}>●</span>
              오늘 묵상할 영상이 새로 등록되어 있어요.
            </p>
          </div>

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
              playlists.map((pl) => <PlaylistSection key={pl.id} playlist={pl} limit={limit} />)
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
