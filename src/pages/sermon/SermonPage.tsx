import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAudio } from '@/contexts/AudioContext'
import { useQueueStore } from '@/store/queueStore'
import { setSelahMenu } from '@/lib/selahMenu'
import { getLastSermonResume, dismissSermonLast, type SermonResumeData } from '@/lib/sermonResume'
import { fs } from '@/lib/fontScale'
import Thumb from '@/components/Thumb'

interface CategoryNode {
  id: string
  title: string
  ordering: number
  videoCount: number
  thumbnail: string | null
  isCompleted: boolean
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
  isSecret?: boolean | null
}

const ACCENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']

function subtreeVideoCount(node: CategoryNode): number {
  return node.videoCount + node.children.reduce((s, c) => s + subtreeVideoCount(c), 0)
}

function formatDuration(secs: number): string {
  const total = Math.floor(secs)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── 영상 썸네일 카드 ───────────────────────────────────────────
function VideoThumbCard({ video, onPlay, titleOnly }: { video: Video; onPlay: () => void; titleOnly?: boolean }) {
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
          <Thumb src={video.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--surface-2), var(--surface-3, #e0e0e0))' }} />
        )}
        {typeof video.duration === 'number' && video.duration > 0 && (
          <span style={{
            position: 'absolute', bottom: 5, right: 6,
            fontSize: fs(11), fontWeight: 600,
            background: 'rgba(0,0,0,0.72)', color: '#fff',
            padding: '1px 5px', borderRadius: 4,
          }}>
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div style={{
        marginTop: 7, fontSize: fs(13), fontWeight: 500,
        color: 'var(--ink-1)', lineHeight: 1.4,
        overflow: 'hidden', maxHeight: '2.8em',
      }}>
        {titleOnly ? video.title : (video.description || video.title)}
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
      style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <div style={{
        width: '100%', height: 80, borderRadius: 10,
        position: 'relative', overflow: 'hidden',
      }}>
        {node.thumbnail ? (
          <>
            <Thumb src={node.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', textAlign: 'center', color: '#fff', fontSize: fs(15), fontWeight: 800, lineHeight: fs(19), textShadow: '0 1px 3px rgba(0,0,0,0.28)', overflow: 'hidden' }}>
              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.title}</span>
            </div>
          </>
        )}
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: fs(12), color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
          {node.children.length > 0 ? `${node.children.length}개` : (total > 0 ? `${total}편` : '준비중')}
        </div>
        {node.isCompleted && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            padding: '2px 7px',
            borderRadius: 4,
            border: '1.5px solid rgba(220,38,38,0.85)',
            color: 'rgba(220,38,38,0.95)',
            fontSize: fs(10), fontWeight: 800,
            background: 'rgba(255,255,255,0.88)',
            letterSpacing: '0.05em',
            transform: 'rotate(8deg)',
            lineHeight: 1.4,
          }}>
            완결
          </div>
        )}
      </div>
      <div style={{
        marginTop: 7, fontSize: fs(13), fontWeight: 600,
        color: 'var(--ink-0)', lineHeight: 1.4,
        overflow: 'hidden', maxHeight: '2.8em',
      }}>
        {node.title}
      </div>
    </div>
  )
}

// ── 영상 row 콘텐츠 (lazy fetch) ───────────────────────────────
function VideoRowContent({ categoryId, categoryTitle, accent }: { categoryId: string; categoryTitle?: string; accent: string }) {
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
      tag: null, type: 'SERMON', hymnTitle: v.title, duration: v.duration ?? null,
      playerPath: `/sermon/player/${v.id}`,
      categoryId, categoryTitle,
    }))
    setQueue(ids, index, metas)
    playVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, tag: null, type: 'SERMON', hymnTitle: video.title, isSecret: video.isSecret, categoryId, categoryTitle })
    navigate(`/sermon/player/${video.id}`, { state: { categoryId, categoryTitle } })
  }, [videos, setQueue, playVideo, navigate, categoryId, categoryTitle])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 16px 4px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flexShrink: 0, width: 164, height: 92, borderRadius: 8, background: 'var(--surface-2)', opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    )
  }

  if (!videos.length) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 16px 4px' }}>
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
              fontSize: fs(13), fontWeight: 700, color: 'rgba(255,255,255,0.9)',
            }}>
              준비중
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 16px 4px' }}>
      {videos.map((video, i) => (
        <VideoThumbCard key={video.id} video={video} onPlay={() => handlePlay(video, i)} titleOnly={categoryId === 'recent-sermon'} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 12 }}>
          <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: fs(16), fontWeight: 700, color: 'var(--ink-0)' }}>{node.title}</span>
          <span style={{ fontSize: fs(12), color: 'var(--ink-3)', marginLeft: 2 }}>
            {isLeaf ? (total > 0 ? `${total}편` : '준비중') : `${node.children.length}개 시리즈`}
          </span>
      </div>

      {/* 콘텐츠 */}
      {isLeaf ? (
        <VideoRowContent categoryId={node.id} categoryTitle={node.title} accent={accent} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))', gap: 10, padding: '0 16px 4px' }}>
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

// ── 시리즈 검색 ────────────────────────────────────────────────
interface SeriesSearchResult {
  id: string
  title: string
  path: string
  videoCount: number
  childCount: number
}

function SearchResultRow({ result, onClick }: { result: SeriesSearchResult; onClick: () => void }) {
  // 조상 경로에서 자기 제목은 빼고 상위 경로만 표기 (예: "책설교 > 존 플라벨")
  const parentPath = result.path.split(' > ').slice(0, -1).join(' > ')
  const count = result.childCount > 0 ? `${result.childCount}개` : `${result.videoCount}편`
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)', border: '1px solid var(--divider)', borderRadius: 10,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div style={{ minWidth: 0 }}>
        {parentPath && (
          <div style={{ fontSize: fs(11), color: 'var(--ink-3)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {parentPath}
          </div>
        )}
        <div style={{ fontSize: fs(15), fontWeight: 600, color: 'var(--ink-0)' }}>{result.title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
        <span style={{ fontSize: fs(12), color: 'var(--ink-3)' }}>{count}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  )
}

// ── 페이지 ────────────────────────────────────────────────────
export default function SermonPage() {
  const navigate = useNavigate()
  const { currentVideo } = useAudio()
  const { data: categories, isLoading } = useQuery<CategoryNode[]>({
    queryKey: ['sermon-categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryNode[]>('/sermon-categories')
      return data
    },
  })
  const [resumeData, setResumeData] = useState<SermonResumeData | null>(null)

  // 시리즈 검색
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((v: string) => {
    setSearchInput(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(v.trim()), 300)
  }, [])

  const { data: searchResults, isLoading: searchLoading } = useQuery<SeriesSearchResult[]>({
    queryKey: ['sermon-category-search', debouncedQuery],
    queryFn: async () => {
      const { data } = await api.get<SeriesSearchResult[]>('/sermon-categories/search', { params: { q: debouncedQuery } })
      return data
    },
    enabled: debouncedQuery.length > 0,
  })

  const isSearching = debouncedQuery.length > 0

  useEffect(() => {
    setSelahMenu('/sermon')
    if (currentVideo) return
    const data = getLastSermonResume()
    // 다운로드가 완료된 경우에만 이어듣기 팝업 표시
    if (data && data.downloaded) setResumeData(data)
  }, [])

  const handleResume = () => {
    if (!resumeData) return
    setResumeData(null)
    navigate(`/sermon/player/${resumeData.videoId}`, {
      state: {
        categoryId: resumeData.categoryId,
        categoryTitle: resumeData.categoryTitle,
        sermonSeek: resumeData.position,
      },
    })
  }

  const handleDismissResume = () => {
    // 닫기: last만 null로 비운다(배열의 저장 위치는 유지 → 설교 직접 진입 시 A/B 팝업은 계속 뜸).
    dismissSermonLast()
    setResumeData(null)
  }

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ minHeight: 56, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>설교</h1>
        </div>
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--ink-3)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="시리즈 검색"
              style={{
                width: '100%', minHeight: 40, padding: '0 36px 0 36px',
                background: 'var(--surface-1)', border: '1px solid var(--divider)',
                borderRadius: 10, fontSize: fs(14), color: 'var(--ink-0)', outline: 'none',
              }}
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                aria-label="검색어 지우기"
                style={{
                  position: 'absolute', right: 8, width: 24, height: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ paddingTop: 20, paddingBottom: 32 }}>
        {isSearching ? (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: fs(14) }}>검색 중…</div>
            ) : (searchResults?.length ?? 0) > 0 ? (
              searchResults!.map((r) => (
                <SearchResultRow key={r.id} result={r} onClick={() => navigate(`/sermon/category/${r.id}`)} />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-3)', fontSize: fs(14) }}>
                "{debouncedQuery}" 검색 결과가 없어요
              </div>
            )}
          </div>
        ) : isLoading ? (
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

      {resumeData && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}
          onClick={handleDismissResume}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: 'var(--white)',
              borderRadius: 20,
              padding: '28px 24px 24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: fs(13), fontWeight: 600, color: 'var(--primary-700)', marginBottom: 4 }}>이어서 듣기</p>
            <p style={{ fontSize: fs(15), fontWeight: 700, color: 'var(--ink-0)', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {resumeData.videoTitle}
            </p>
            <p style={{ fontSize: fs(13), color: 'var(--ink-3)', marginBottom: 22 }}>
              {formatDuration(Math.floor(resumeData.position))}까지 들으셨어요
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleResume}
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
                onClick={handleDismissResume}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--surface-1)', color: 'var(--ink-1)',
                  borderRadius: 12, fontSize: fs(15), fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
