import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFavoritesStore } from '@/store/favoritesStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useQueueStore } from '@/store/queueStore'
import { useAudio } from '@/contexts/AudioContext'
import VideoCard from '@/components/VideoCard'

type SortMode = 'chapterAsc' | 'chapterDesc'

interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  chapter?: number | null
  hymnTitle?: string | null
  publishedAt?: string | null
  duration?: number | null
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

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { ids: favIds } = useFavoritesStore()
  const { playVideo } = useAudio()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const setQueue = useQueueStore((s) => s.setQueue)

  const [sortMode, setSortMode] = useState<SortMode>('chapterAsc')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<VideoPage>({
    queryKey: ['favorites-videos', sortMode, debouncedQuery, favIds.join(',')],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!favIds.length) return { videos: [], total: 0, page: 1, limit: PAGE_LIMIT, hasMore: false, playlists: [] }
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_LIMIT),
        sort: sortMode,
        favIds: favIds.join(','),
      })
      if (debouncedQuery) params.set('search', debouncedQuery)
      const { data } = await api.get<VideoPage>(`/videos?${params}`)
      return data
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: true,
  })

  const allVideos = data?.pages.flatMap((p) => p.videos) ?? []
  const total = data?.pages[0]?.total ?? 0

  const handleSearchChange = useCallback((v: string) => {
    setSearchQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(v.trim()), 300)
  }, [])

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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, allVideos.length])

  const handlePlay = (v: Video) => {
    const allIds = data?.pages[0]?.playlists ?? []
    const idx = allIds.indexOf(v.id)
    setQueue(allIds, idx)
    playVideo(
      { id: v.id, title: v.title, thumbnail: v.thumbnail, tag: v.tag, hymnTitle: v.hymnTitle },
      { autoPlay: autoPlayOnDetail },
    )
    navigate(`/player/${v.id}`)
  }

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        {/* Title row */}
        <div className="flex items-center gap-2 px-4" style={{ height: 56 }}>
          <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>즐겨찾기</h1>
          {!!favIds.length && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
            >
              {total}
            </span>
          )}
        </div>

        {favIds.length > 0 && (
          <>
            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  style={{ color: 'var(--ink-3)' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="즐겨찾기 내 검색"
                  className="w-full text-sm outline-none pl-9 pr-8"
                  style={{
                    height: 34,
                    background: 'var(--surface-1)',
                    border: '1px solid var(--divider)',
                    borderRadius: 8,
                    color: 'var(--ink-0)',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-500)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--divider)')}
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full"
                    style={{ background: 'var(--ink-3)', color: 'var(--white)', fontSize: 9, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Sort row */}
            <div className="flex items-center justify-end px-4 pb-3">
              <div
                className="flex items-center overflow-hidden"
                style={{ border: '1px solid var(--divider)', borderRadius: 7, background: 'var(--surface-1)' }}
              >
                {(['chapterAsc', 'chapterDesc'] as const).map((mode, i) => {
                  const isActive = sortMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      className="flex items-center gap-0.5 text-xs font-medium transition-colors duration-150"
                      style={{
                        padding: '4px 8px',
                        color: isActive ? 'var(--white)' : 'var(--ink-2)',
                        background: isActive ? 'var(--primary-700)' : 'transparent',
                        borderRight: i === 0 ? '1px solid var(--divider)' : 'none',
                      }}
                    >
                      장{mode === 'chapterAsc' ? '↑' : '↓'}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </header>

      {/* List */}
      {!favIds.length ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <span className="text-5xl mb-4">☆</span>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-1)' }}>즐겨찾기가 비어있어요</p>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>영상 카드의 ☆ 를 탭해 추가하세요</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        </div>
      ) : allVideos.length ? (
        <>
          {allVideos.map((v) => (
            <VideoCard key={v.id} video={v} onClick={() => handlePlay(v)} layout="list" />
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
          <span className="text-4xl mb-4">📭</span>
          <p className="text-sm" style={{ color: 'var(--ink-1)' }}>
            {debouncedQuery ? `"${debouncedQuery}"에 맞는 곡이 없어요.` : '등록된 영상이 없어요.'}
          </p>
        </div>
      )}
    </div>
  )
}
