import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAudio } from '@/contexts/AudioContext'
import { useQueueStore } from '@/store/queueStore'
import { setSelahMenu } from '@/lib/selahMenu'

interface CategoryNode {
  id: string
  title: string
  ordering: number
  videoCount: number
  thumbnail: string | null
  children: CategoryNode[]
}

interface Video {
  id: string
  title: string
  description?: string | null
  thumbnail: string | null
  tag: string | null
  chapter?: number | null
  duration?: number | null
  viewCount?: number | null
  likeCount?: number | null
}

const ACCENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']

function subtreeVideoCount(node: CategoryNode): number {
  return node.videoCount + node.children.reduce((s, c) => s + subtreeVideoCount(c), 0)
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── 영상 썸네일 카드 ───────────────────────────────────────────
function VideoThumbCard({ video, onPlay }: { video: Video; onPlay: () => void }) {
  return (
    <div
      onClick={onPlay}
      style={{ flexShrink: 0, width: 164, cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <div style={{
        width: 164, height: 92,
        borderRadius: 8, overflow: 'hidden',
        background: 'var(--surface-2)',
        position: 'relative',
      }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--surface-2), var(--surface-3, #e0e0e0))' }} />
        )}
        {typeof video.duration === 'number' && video.duration > 0 && (
          <span style={{
            position: 'absolute', bottom: 5, right: 6,
            fontSize: 11, fontWeight: 600,
            background: 'rgba(0,0,0,0.72)', color: '#fff',
            padding: '1px 5px', borderRadius: 4,
          }}>
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div style={{
        marginTop: 7, fontSize: 13, fontWeight: 500,
        color: 'var(--ink-1)', lineHeight: 1.4,
        overflow: 'hidden', maxHeight: '2.8em',
      }}>
        {video.description || video.title}
      </div>
    </div>
  )
}

// ── 서브카테고리 카드 ──────────────────────────────────────────
function SubCatCard({ node, accent, onClick }: { node: CategoryNode; accent: string; onClick: () => void }) {
  const total = subtreeVideoCount(node)
  return (
    <div
      onClick={onClick}
      style={{ flexShrink: 0, width: 136, cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <div style={{
        width: 136, height: 80, borderRadius: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        {node.thumbnail ? (
          <>
            <img src={node.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)' }} />
          </>
        ) : (
          <>
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(140deg, ${accent}e0 0%, ${accent}70 100%)`,
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
            }} />
          </>
        )}
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
          {total > 0 ? `${total}편` : '준비중'}
        </div>
      </div>
      <div style={{
        marginTop: 7, fontSize: 13, fontWeight: 600,
        color: 'var(--ink-0)', lineHeight: 1.4,
        overflow: 'hidden', maxHeight: '2.8em',
      }}>
        {node.title}
      </div>
    </div>
  )
}

// ── 영상 row 콘텐츠 (lazy fetch) ───────────────────────────────
function VideoRowContent({ categoryId, accent }: { categoryId: string; accent: string }) {
  const navigate = useNavigate()
  const { playVideo } = useAudio()
  const setQueue = useQueueStore((s) => s.setQueue)

  const { data, isLoading } = useQuery<{ videos: Video[]; total: number }>({
    queryKey: ['sermon-category-videos', categoryId],
    queryFn: async () => {
      const { data } = await api.get(`/sermon-categories/${categoryId}/videos?page=1&limit=20`)
      return data
    },
  })

  const videos = data?.videos ?? []

  const handlePlay = useCallback((video: Video, index: number) => {
    const ids = videos.map((v) => v.id)
    const metas = videos.map((v) => ({
      id: v.id, title: v.title, thumbnail: v.thumbnail,
      tag: null, hymnTitle: v.title, duration: v.duration ?? null,
    }))
    setQueue(ids, index, metas)
    playVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, tag: null, hymnTitle: video.title })
    navigate(`/player/${video.id}`)
  }, [videos, setQueue, playVideo, navigate])

  if (isLoading) {
    return (
      <div className="sermon-hscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flexShrink: 0, width: 164, height: 92, borderRadius: 8, background: 'var(--surface-2)', opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    )
  }

  if (!videos.length) {
    return (
      <div className="sermon-hscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }}>
        <div style={{ flexShrink: 0, width: 164 }}>
          <div style={{
            width: 164, height: 92, borderRadius: 8,
            position: 'relative', overflow: 'hidden',
            background: `linear-gradient(140deg, ${accent}e0 0%, ${accent}70 100%)`,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
            }}>
              준비중
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sermon-hscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }}>
      {videos.map((video, i) => (
        <VideoThumbCard key={video.id} video={video} onPlay={() => handlePlay(video, i)} />
      ))}
    </div>
  )
}

// ── 카테고리 row ───────────────────────────────────────────────
function CategoryRow({ node, accent }: { node: CategoryNode; accent: string }) {
  const navigate = useNavigate()
  const isLeaf = node.children.length === 0
  const total = subtreeVideoCount(node)

  return (
    <section style={{ marginBottom: 36 }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)' }}>{node.title}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 2 }}>
            {isLeaf ? (total > 0 ? `${total}편` : '준비중') : `${node.children.length}개 시리즈`}
          </span>
        </div>
        <button
          onClick={() => navigate(`/sermon/category/${node.id}`)}
          style={{
            fontSize: 13, fontWeight: 600, color: accent,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: 2,
          }}
        >
          전체보기
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 콘텐츠 */}
      {isLeaf ? (
        <VideoRowContent categoryId={node.id} accent={accent} />
      ) : (
        <div className="sermon-hscroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }}>
          {node.children.map((child, i) => (
            <SubCatCard
              key={child.id}
              node={child}
              accent={ACCENT_COLORS[i % ACCENT_COLORS.length]}
              onClick={() => navigate(`/sermon/category/${child.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ── 스켈레톤 ─────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {[0, 1, 2].map((s) => (
        <div key={s}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 12 }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: 'var(--surface-2)' }} />
            <div style={{ width: 90, height: 16, borderRadius: 6, background: 'var(--surface-2)' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                flexShrink: 0, width: 164, height: 92,
                borderRadius: 8, background: 'var(--surface-2)', opacity: 1 - i * 0.18,
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 페이지 ────────────────────────────────────────────────────
export default function SermonPage() {
  const { data: categories, isLoading } = useQuery<CategoryNode[]>({
    queryKey: ['sermon-categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryNode[]>('/sermon-categories')
      return data
    },
  })

  useEffect(() => {
    setSelahMenu('/sermon')
  }, [])

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>설교</h1>
        </div>
      </header>

      <div style={{ paddingTop: 20, paddingBottom: 32 }}>
        {isLoading ? (
          <SkeletonRows />
        ) : (
          (categories ?? []).map((cat, i) => (
            <CategoryRow key={cat.id} node={cat} accent={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
          ))
        )}
      </div>

      <style>{`
        .sermon-hscroll::-webkit-scrollbar { display: none; }
        .sermon-hscroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
