import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { api } from '@/lib/api'
import { useAudio } from '@/contexts/AudioContext'
import VideoCard from '@/components/VideoCard'
import { useQueueStore } from '@/store/queueStore'

interface CategoryNode {
  id: string
  title: string
  ordering: number
  videoCount: number
  children: CategoryNode[]
}

interface Video {
  id: string
  title: string
  description?: string | null
  thumbnail: string | null
  tag: string | null
  chapter?: number | null
  publishedAt?: string | null
  duration?: number | null
  viewCount?: number | null
  likeCount?: number | null
}

interface VideoPage {
  videos: Video[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

function subtreeHasContent(node: CategoryNode): boolean {
  return node.videoCount > 0 || node.children.some(subtreeHasContent)
}

const PAGE_LIMIT = 20

export default function SermonCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playVideo } = useAudio()
  const setQueue = useQueueStore((s) => s.setQueue)
  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ['sermon-category', id],
    queryFn: async () => {
      const { data } = await api.get<CategoryNode>(`/sermon-categories/${id}`)
      return data
    },
    enabled: !!id,
  })

  const {
    data,
    isLoading: videosLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<VideoPage>({
    queryKey: ['sermon-category-videos', id],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<VideoPage>(
        `/sermon-categories/${id}/videos?page=${pageParam}&limit=${PAGE_LIMIT}`,
      )
      return data
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: !!id,
  })

  const allVideos = data?.pages.flatMap((p) => p.videos) ?? []
  const total = data?.pages[0]?.total ?? 0

  const observerCb = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  const sentinelCallbackRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const obs = new IntersectionObserver(observerCb, { rootMargin: '200px' })
      obs.observe(el)
    },
    [observerCb],
  )

  const handleVideoClick = (video: Video, index: number) => {
    const ids = allVideos.map((v) => v.id)
    const metas = allVideos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail,
      tag: v.tag,
      hymnTitle: v.title,
      duration: v.duration ?? null,
    }))
    setQueue(ids, index, metas)
    playVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag, hymnTitle: video.title })
    navigate(`/player/${video.id}`)
  }

  if (catLoading) {
    return (
      <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
        <header style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 18, borderRadius: 4, background: 'var(--surface-2)' }} />
          </div>
        </header>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      {/* AppBar */}
      <header style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ padding: '8px 8px 8px 0', color: 'var(--ink-0)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink-0)' }}>{category?.title}</h1>
          </div>
          {total > 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>총 {total}편</span>
          )}
        </div>
      </header>

      {/* 하위 카테고리 */}
      {category && category.children.length > 0 && (
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {category.children.map((child) => {
              const hasContent = subtreeHasContent(child)
              return (
                <div
                  key={child.id}
                  onClick={() => hasContent && navigate(`/sermon/category/${child.id}`)}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--divider)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: hasContent ? 'pointer' : 'default',
                    opacity: hasContent ? 1 : 0.75,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-0)' }}>{child.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasContent ? (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{child.videoCount}편</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    ) : (
                      <span style={{
                        padding: '2px 9px', borderRadius: 20,
                        background: 'var(--primary-50)', color: 'var(--primary-700)',
                        fontSize: 11, fontWeight: 600,
                      }}>준비중</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 영상 목록 */}
      {category && category.videoCount > 0 && (
        <div style={{ marginTop: category.children.length > 0 ? 16 : 8 }}>
          {category.children.length > 0 && (
            <div style={{ padding: '0 16px 8px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>영상</span>
            </div>
          )}
          {videosLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  height: 76, margin: '0 16px 8px',
                  borderRadius: 8, background: 'var(--surface-1)', opacity: 1 - i * 0.25,
                }} />
              ))}
            </div>
          ) : (
            <>
              {allVideos.map((video, i) => (
                <VideoCard
                  key={video.id}
                  video={{ ...video, hymnTitle: video.title, title: video.description ?? '', tag: null }}
                  layout="list"
                  onClick={() => handleVideoClick(video, i)}
                />
              ))}
              <div ref={sentinelCallbackRef} style={{ height: 1 }} />
              {isFetchingNextPage && (
                <div style={{ textAlign: 'center', padding: '16px', fontSize: 13, color: 'var(--ink-3)' }}>
                  불러오는 중…
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 빈 상태 — 직접 영상도 없고 하위 카테고리도 없을 때 */}
      {category && category.videoCount === 0 && category.children.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 32px', gap: 12 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
            아직 등록된 설교가 없습니다.
          </p>
        </div>
      )}
    </div>
  )
}
