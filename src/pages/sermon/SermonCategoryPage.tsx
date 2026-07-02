import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import VideoCard from '@/components/VideoCard'
import LazyRow from '@/components/LazyRow'
import Thumb from '@/components/Thumb'
import { useQueueStore } from '@/store/queueStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { downloadMedia, isOfflineMediaSupported, cancelDownload, deleteMedia } from '@/lib/mediaStore'
import { fs } from '@/lib/fontScale'
import { getSortPref, setSortPref, type SortMode } from '@/lib/sortPref'

interface CategoryNode {
  id: string
  title: string
  ordering: number
  videoCount: number
  thumbnail?: string | null
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
  publishedAt?: string | null
  duration?: number | null
  viewCount?: number | null
  likeCount?: number | null
  isSecret?: boolean | null
}

interface VideoPage {
  videos: Video[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}


function subtreeVideoCount(node: CategoryNode): number {
  return node.videoCount + node.children.reduce((s, c) => s + subtreeVideoCount(c), 0)
}


const ACCENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9']


function ChildSubCatCard({ node, accent, onClick }: { node: CategoryNode; accent: string; onClick: () => void }) {
  const total = subtreeVideoCount(node)
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ width: '100%', height: 80, borderRadius: 10, position: 'relative', overflow: 'hidden' }}>
        {node.thumbnail ? (
          <>
            <Thumb src={node.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)' }} />
          </>
        ) : (
          <>
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(140deg, ${accent}e0 0%, ${accent}70 100%)` }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', textAlign: 'center', color: '#fff', fontSize: fs(15), fontWeight: 800, lineHeight: fs(19), textShadow: '0 1px 3px rgba(0,0,0,0.28)', overflow: 'hidden' }}>
              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.title}</span>
            </div>
          </>
        )}
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: fs(12), color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
          {node.children.length > 0 ? `${node.children.length}개` : (total > 0 ? `${total}편` : '준비중')}
        </div>
        {node.isCompleted && (
          <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 7px', borderRadius: 4, border: '1.5px solid rgba(220,38,38,0.85)', color: 'rgba(220,38,38,0.95)', fontSize: fs(10), fontWeight: 800, background: 'rgba(255,255,255,0.88)', letterSpacing: '0.05em', transform: 'rotate(8deg)', lineHeight: 1.4 }}>
            완결
          </div>
        )}
      </div>
      <div style={{ marginTop: 7, fontSize: fs(13), fontWeight: 600, color: 'var(--ink-0)', lineHeight: 1.4, overflow: 'hidden', maxHeight: '2.8em' }}>
        {node.title}
      </div>
    </div>
  )
}

// 비리프(하위 카테고리 있음) 자식만 행으로 표시 — 영상 인라인 없음
function ChildCategoryRow({ node, accent }: { node: CategoryNode; accent: string }) {
  const navigate = useNavigate()
  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 12 }}>
        <div style={{ width: 4, height: 18, background: accent, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: fs(16), fontWeight: 700, color: 'var(--ink-0)' }}>{node.title}</span>
        <span style={{ fontSize: fs(12), color: 'var(--ink-3)', marginLeft: 2 }}>
          {`${node.children.length}개 시리즈`}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))', gap: 10, padding: '0 16px 4px' }}>
        {node.children.map((child, i) => (
          <ChildSubCatCard key={child.id} node={child} accent={ACCENT_COLORS[i % ACCENT_COLORS.length]} onClick={() => navigate(`/sermon/category/${child.id}`)} />
        ))}
      </div>
    </section>
  )
}

const PAGE_LIMIT = 100
// 점프 칩(1~10, 11~20 …) 묶음 크기. fetch 페이지 크기(PAGE_LIMIT)와 분리.
const JUMP_CHUNK = 20 // 점프 단위 고정 20개

export default function SermonCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setQueue = useQueueStore((s) => s.setQueue)
  const offlineStorageMode = useSettingsStore((s) => s.offlineStorageMode)
  const { cachedIds, refresh } = useCachedMediaStore()
  const offlineMediaOk = isOfflineMediaSupported()
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  // 벌크(2개 이상) 다운로드 모달 상태 — null이면 모달 없음
  const [bulkState, setBulkState] = useState<{ total: number; done: number } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>(() => getSortPref('sermon', id))
  const bulkIdsRef = useRef<string[]>([])
  const bulkCancelledRef = useRef(false)
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
    queryKey: ['sermon-category-videos', id, sortMode],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<VideoPage>(
        `/sermon-categories/${id}/videos?page=${pageParam}&limit=${PAGE_LIMIT}&sort=${sortMode}`,
      )
      return data
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: !!id,
  })

  const allVideos = data?.pages.flatMap((p) => p.videos) ?? []
  const total = data?.pages[0]?.total ?? 0
  // 비디오는 오프라인 다운로드를 지원하지 않는다(항상 스트리밍) — 저장 대상은 항상 오디오.
  const dlType = 'audio'

  const [pendingJumpChapter, setPendingJumpChapter] = useState<number | null>(null)
  const videoRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  // 상단 고정(sticky) 헤더 영역(앱바+정렬+점프행) ref → 점프 시 그 높이만큼 보정(폰트배율에도 정확).
  const stickyRef = useRef<HTMLDivElement>(null)
  const fontScale = useSettingsStore((s) => s.fontScale)
  // 측정한 행 높이(스켈레톤/LazyRow placeholder 통일용) + 점프 중 여부.
  const [rowHeight, setRowHeight] = useState(96)
  const [isJumping, setIsJumping] = useState(false)

  // LazyRow가 화면 밖 행을 unmount(placeholder 높이)하다 진입 시 실제 높이로 바뀌어
  // 한 번 스크롤로는 위치가 어긋난다. 마운트가 안정될 때까지 여러 번 재보정해 수렴시킨다.
  // 부드러운 점프: 매 프레임 목표까지 남은 거리를 다시 재서 20%씩 접근(ease-out).
  // 매 프레임 재계산이라 LazyRow가 스크롤 중 마운트되며 높이가 바뀌어도 끊김 없이 흡수·수렴한다.
  const scrollAnimRef = useRef<number>(0)
  const scrollToIndex = useCallback((idx: number) => {
    cancelAnimationFrame(scrollAnimRef.current)
    setIsJumping(true) // 점프 중엔 행을 스켈레톤(균일 높이)으로 → 렌더 안 하고 스무스하게 통과
    const off = () => (stickyRef.current?.offsetHeight ?? 64) + 8
    let frames = 0
    let settle = 0
    const stop = () => { setIsJumping(false) }
    const step = () => {
      const el = videoRefs.current.get(idx)
      if (el) {
        const cur = window.scrollY
        const dist = el.getBoundingClientRect().top - off() // 남은 거리(매 프레임 재계산)
        if (Math.abs(dist) < 1.5) {
          if (++settle > 2) { stop(); return } // 정착 → 실콘텐츠 복귀
        } else {
          settle = 0
          window.scrollTo(0, cur + dist * 0.2)
        }
      }
      if (frames++ < 150) scrollAnimRef.current = requestAnimationFrame(step)
      else stop()
    }
    scrollAnimRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  useEffect(() => {
    setSortMode(getSortPref('sermon', id))
    // 카테고리 바뀌면 이전 점프/활성 잔존 제거 — 새 데이터 로드 전까지 칩 숨김(아래 게이트).
    setActiveKey('start')
    setIsJumping(false)
  }, [id])

  // 아직 로드 안 된 편으로 점프 요청 시: 발견될 때까지 다음 페이지를 로드한 뒤 스크롤.
  useEffect(() => {
    if (pendingJumpChapter === null) return
    const idx = allVideos.findIndex((v) => v.chapter === pendingJumpChapter)
    if (idx >= 0) {
      scrollToIndex(idx)
      setPendingJumpChapter(null)
    } else if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    } else if (!hasNextPage) {
      setPendingJumpChapter(null) // 끝까지 로드했는데 해당 편 없음 → 포기
    }
  }, [pendingJumpChapter, allVideos, hasNextPage, isFetchingNextPage, fetchNextPage, scrollToIndex])

  // 점프: 해당 편 번호가 있는 위치로 스크롤. 현재 정렬 순서대로 찾으므로
  // 끝부터(desc)면 같은 번호라도 스크롤 방향만 자동으로 반대가 된다.
  const handleJumpTo = useCallback((chapter: number) => {
    const idx = allVideos.findIndex((v) => v.chapter === chapter)
    if (idx >= 0) scrollToIndex(idx)
    else setPendingJumpChapter(chapter)
  }, [allVideos, scrollToIndex])

  // 처음으로 / 끝으로. 끝으로는 미로드 페이지가 있으면 끝까지 로드한 뒤 마지막으로.
  const [pendingEnd, setPendingEnd] = useState(false)
  useEffect(() => {
    if (!pendingEnd) return
    if (hasNextPage) {
      if (!isFetchingNextPage) void fetchNextPage()
    } else {
      if (allVideos.length > 0) scrollToIndex(allVideos.length - 1)
      setPendingEnd(false)
    }
  }, [pendingEnd, hasNextPage, isFetchingNextPage, fetchNextPage, allVideos.length, scrollToIndex])

  const handleJumpToStart = useCallback(() => {
    scrollToIndex(0)
  }, [scrollToIndex])
  const handleJumpToEnd = useCallback(() => {
    if (hasNextPage) setPendingEnd(true)
    else if (allVideos.length > 0) scrollToIndex(allVideos.length - 1)
  }, [hasNextPage, allVideos.length, scrollToIndex])

  // 점프 칩: 라벨은 항상 10,20,30…(정렬 무관). 점프 동작만 정렬 따라 반대로.
  // 전체 로드됐으면 실제 최대 편번호까지만 마커 생성(존재하지 않는 번호 칩 방지).
  const maxMark = !hasNextPage
    ? allVideos.reduce((m, v) => Math.max(m, v.chapter ?? 0), 0)
    : total
  const pageChips: { label: string; chapter: number }[] = []
  // 점프 단위 고정 20. 마지막 마커가 끝(끝으로)과 겹치면 생략 — n 다음에 한 청크가 더 남아야 표시.
  if (maxMark > JUMP_CHUNK) {
    for (let n = JUMP_CHUNK; n + JUMP_CHUNK <= maxMark; n += JUMP_CHUNK) {
      pageChips.push({ label: `${n}`, chapter: n })
    }
  }

  // 점프 항목 = 처음으로 + 숫자칩 + 끝으로. 스크롤 위치에 따라 현재 항목을 강조(스크롤 스파이).
  // 끝부터(desc)면 숫자 칩 순서를 역순(…80,70,10)으로 — 리스트가 내림차순이라 점프도 거꾸로.
  // 처음으로/끝으로는 정렬과 무관하게 양 끝 고정.
  const numberItems = pageChips.map((c) => ({
    key: String(c.chapter),
    label: c.label,
    index: allVideos.findIndex((v) => v.chapter === c.chapter),
    onClick: () => handleJumpTo(c.chapter),
  }))
  const jumpItems = [
    { key: 'start', label: '처음으로', index: 0, onClick: handleJumpToStart },
    ...(sortMode === 'chapterDesc' ? [...numberItems].reverse() : numberItems),
    { key: 'end', label: '끝으로', index: allVideos.length - 1, onClick: handleJumpToEnd },
  ]
  const jumpItemsRef = useRef(jumpItems)
  jumpItemsRef.current = jumpItems
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [activeKey, setActiveKey] = useState('start')

  const recomputeActive = useCallback(() => {
    const items = jumpItemsRef.current
    const stickyH = stickyRef.current?.offsetHeight ?? 64
    const vh = window.innerHeight
    let active: string | null = null
    let best = Infinity
    // 1순위: 화면에 보이는 마커 중 스크롤상 가장 위(top이 가장 작은 것)
    for (const it of items) {
      if (it.index < 0) continue
      const el = videoRefs.current.get(it.index)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.bottom > stickyH && r.top < vh && r.top < best) { best = r.top; active = it.key }
    }
    // 2순위(보이는 마커 없으면): 화면 위로 지나간 가장 가까운 마커
    if (active === null) {
      let bestAbove = -Infinity
      for (const it of items) {
        if (it.index < 0) continue
        const el = videoRefs.current.get(it.index)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= stickyH + 1 && r.top > bestAbove) { bestAbove = r.top; active = it.key }
      }
    }
    if (active !== null) setActiveKey(active)
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(recomputeActive) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [recomputeActive])

  // 리스트/정렬 변경으로 행이 새로 그려지면 활성 재계산
  useEffect(() => {
    const raf = requestAnimationFrame(recomputeActive)
    return () => cancelAnimationFrame(raf)
  }, [allVideos.length, sortMode, recomputeActive])

  // 활성 칩을 가로 점프바 안으로 스크롤(세로 스크롤엔 영향 없게 block:nearest)
  useEffect(() => {
    chipRefs.current.get(activeKey)?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [activeKey])

  // 행 높이 측정(스켈레톤/LazyRow placeholder 높이 통일용). 폰트배율/리사이즈 반응.
  const recomputeRowHeight = useCallback(() => {
    const row = videoRefs.current.get(0)
    const rowH = row?.offsetHeight ?? 0
    if (rowH < 10) return
    setRowHeight((prev) => (prev === rowH ? prev : rowH))
  }, [])
  useEffect(() => {
    const raf = requestAnimationFrame(recomputeRowHeight)
    const onResize = () => recomputeRowHeight()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [recomputeRowHeight, allVideos.length, fontScale])

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
      type: 'SERMON',
      hymnTitle: v.title,
      duration: v.duration ?? null,
      playerPath: `/sermon/player/${v.id}`,
      categoryId: id,
      categoryTitle: category?.title,
    }))
    setQueue(ids, index, metas)
    navigate(`/sermon/player/${video.id}`, { state: { categoryId: id, categoryTitle: category?.title } })
  }

  const toggleSelect = (videoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(videoId)) next.delete(videoId)
      else next.add(videoId)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selected.size === allVideos.length && allVideos.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allVideos.map((v) => v.id)))
    }
  }

  const handleExitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
  }

  const handleBulkDownload = useCallback(async () => {
    if (!offlineMediaOk || offlineStorageMode === 'thrift') return
    const ids = Array.from(selected).filter((videoId) => !cachedIds.has(`${videoId}-${dlType}`))
    if (ids.length === 0) return
    bulkIdsRef.current = ids
    bulkCancelledRef.current = false
    setDownloadingIds(new Set(ids))
    setBulkState({ total: ids.length, done: 0 })
    setSelectMode(false)
    setSelected(new Set())

    // 한 번에 하나씩(순차) 다운로드. 동시 다운로드는 같은 Invidious 프록시에 부하를 줘
    // throttle/500을 유발하므로 병렬 없이 한 개씩 처리한다.
    const CONCURRENCY = 1
    let cursor = 0
    const worker = async () => {
      while (cursor < ids.length && !bulkCancelledRef.current) {
        const videoId = ids[cursor++]
        let success = false
        for (let attempt = 0; attempt < 3 && !success && !bulkCancelledRef.current; attempt++) {
          try {
            const { data } = await api.get<{ url: string; mimeType?: string }>(
              `/audios/${videoId}/download`,
              { params: { quality: 'high' } },
            )
            await downloadMedia(videoId, data.url, { type: dlType, mimeType: data.mimeType })
            refresh()
            success = true
          } catch {
            if (attempt < 2 && !bulkCancelledRef.current) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          }
        }
        setDownloadingIds((prev) => {
          const next = new Set(prev)
          next.delete(videoId)
          return next
        })
        setBulkState((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev))
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker))

    if (!bulkCancelledRef.current) setBulkState(null)
    refresh()
  }, [selected, dlType, offlineStorageMode, offlineMediaOk, cachedIds, refresh])

  const handleBulkCancel = useCallback(async () => {
    bulkCancelledRef.current = true
    // 진행 중 다운로드 즉시 중단
    for (const videoId of bulkIdsRef.current) cancelDownload(videoId, dlType as 'audio' | 'video')
    // 이번 배치에서 받은 것(완료분 포함) 모두 삭제
    await Promise.all(
      bulkIdsRef.current.map((videoId) => deleteMedia(videoId, dlType as 'audio' | 'video').catch(() => {})),
    )
    setDownloadingIds(new Set())
    setBulkState(null)
    refresh()
  }, [dlType, refresh])

  if (catLoading) {
    return (
      <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
        <header style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky', top: 0, zIndex: 10,
          paddingTop: 'env(safe-area-inset-top)',
        }}>
          <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 18, borderRadius: 4, background: 'var(--surface-2)' }} />
          </div>
        </header>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh', paddingBottom: selectMode ? 80 : 0 }}>
      {/* 상단 고정: 앱바 + 정렬 토글 + 점프 행까지 한 덩어리로 sticky */}
      <div ref={stickyRef} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
      {/* AppBar */}
      <header style={{
        background: 'var(--white)',
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => selectMode ? handleExitSelectMode() : navigate(-1)}
              style={{ padding: '8px 8px 8px 0', color: 'var(--ink-0)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 style={{ fontSize: fs(17), fontWeight: 700, color: 'var(--ink-0)' }}>{category?.title}</h1>
            {category?.isCompleted && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 4,
                border: '1.5px solid rgba(220,38,38,0.8)',
                color: 'rgba(220,38,38,0.9)',
                fontSize: fs(11), fontWeight: 800,
                letterSpacing: '0.05em',
                lineHeight: 1.4,
                transform: 'rotate(4deg)',
                display: 'inline-block',
              }}>
                완결
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {total > 0 && <span style={{ fontSize: fs(12), color: 'var(--ink-2)' }}>총 {total}편</span>}
            {offlineMediaOk && offlineStorageMode !== 'thrift' && total > 0 && !selectMode && (
              <button
                onClick={() => setSelectMode(true)}
                style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-1)', display: 'flex', alignItems: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            )}
            {selectMode && (
              <button
                onClick={handleExitSelectMode}
                style={{ fontSize: fs(14), color: 'var(--primary-700)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}
              >
                취소
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 정렬 토글 (non-sticky) */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', background: 'var(--white)', borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center overflow-hidden" style={{ border: '1px solid var(--divider)', borderRadius: 7, background: 'var(--surface-1)' }}>
            {(['chapterAsc', 'chapterDesc'] as const).map((mode, i) => {
              const isActive = sortMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => { setSortMode(mode); setSortPref('sermon', id, mode) }}
                  className="text-xs font-medium transition-colors duration-150"
                  style={{ padding: '4px 10px', color: isActive ? 'var(--white)' : 'var(--ink-2)', background: isActive ? 'var(--primary-700)' : 'transparent', borderRight: i === 0 ? '1px solid var(--divider)' : 'none' }}
                >
                  {mode === 'chapterAsc' ? '처음부터 ↑' : '끝부터 ↓'}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 편수 점프 chip row — 로딩 중(카테고리 전환 등)엔 숨겨 이전 점프 잔존 방지 */}
      {!videosLoading && pageChips.length > 0 && (
        <div style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          display: 'flex', gap: 6, padding: '8px 16px',
          overflowX: 'auto',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {jumpItems.map((it) => {
            const isActive = activeKey === it.key
            return (
              <button
                key={it.key}
                ref={(el) => { if (el) chipRefs.current.set(it.key, el); else chipRefs.current.delete(it.key) }}
                onClick={it.onClick}
                style={{
                  flexShrink: 0,
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: isActive ? '1px solid var(--primary-700)' : '1px solid var(--divider)',
                  background: isActive ? 'var(--primary-700)' : 'var(--surface-0)',
                  fontSize: fs(12), fontWeight: isActive ? 700 : 600,
                  color: isActive ? 'var(--white)' : 'var(--ink-1)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.label}
              </button>
            )
          })}
        </div>
      )}
      </div>

      {/* 하위 카테고리 — 넷플릭스 방식 */}
      {category && category.children.length > 0 && (
        <div style={{ paddingTop: 20 }}>
          {/* 비리프(하위 카테고리 있음): 각자 섹션 행 */}
          {category.children
            .filter(c => c.children.length > 0)
            .map((child, i) => (
              <ChildCategoryRow key={child.id} node={child} accent={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
            ))}
          {/* 리프(직접 영상): SubCatCard 카드 줄바꿈 */}
          {category.children.filter(c => c.children.length === 0).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))', gap: 10, padding: '4px 16px 20px' }}>
              {category.children
                .filter(c => c.children.length === 0)
                .map((child, i) => (
                  <ChildSubCatCard
                    key={child.id}
                    node={child}
                    accent={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                    onClick={() => navigate(`/sermon/category/${child.id}`)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
      <style>{`.sermon-hscroll::-webkit-scrollbar{display:none}.sermon-hscroll{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* 영상 목록 */}
      {category && category.videoCount > 0 && (
        <div style={{ marginTop: category.children.length > 0 ? 16 : 8 }}>
          {category.children.length > 0 && (
            <div style={{ padding: '0 16px 8px' }}>
              <span style={{ fontSize: fs(13), fontWeight: 600, color: 'var(--ink-2)' }}>영상</span>
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
              {allVideos.map((video, i) => {
                const isDownloading = downloadingIds.has(video.id)
                const isSelected = selected.has(video.id)
                return (
                  <div
                    key={video.id}
                    ref={(el) => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i) }}
                    style={{ position: 'relative' }}
                  >
                    {isJumping ? (
                      // 점프 중: 무거운 VideoCard/이미지 렌더 생략, 모양만 스켈레톤(썸네일+글자 바)으로 스무스 통과
                      <div
                        aria-hidden
                        className="flex items-start gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-4"
                        style={{ borderBottom: '1px solid var(--divider)', minHeight: rowHeight }}
                      >
                        <div
                          className="flex-shrink-0 rounded-[8px]"
                          style={{ background: 'var(--surface-2)', width: 'clamp(80px, 22vw, 140px)', aspectRatio: '16/9' }}
                        />
                        <div className="flex-1 min-w-0 py-0.5">
                          <div style={{ height: fs(14), width: '80%', background: 'var(--surface-2)', borderRadius: 4 }} />
                          <div style={{ height: fs(12), width: '55%', background: 'var(--surface-2)', borderRadius: 4, marginTop: 8 }} />
                          <div style={{ height: fs(11), width: '32%', background: 'var(--surface-2)', borderRadius: 4, marginTop: 8 }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <LazyRow estimatedHeight={rowHeight}>
                          <VideoCard
                            video={{ ...video, hymnTitle: video.title, title: video.description ?? '', tag: null }}
                            layout="list"
                            isDownloading={isDownloading}
                            selectMode={selectMode}
                            onClick={selectMode ? () => toggleSelect(video.id) : () => handleVideoClick(video, i)}
                          />
                        </LazyRow>
                        {selectMode && !cachedIds.has(`${video.id}-${dlType}`) && (
                          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              border: `2px solid ${isSelected ? 'var(--primary-700)' : 'var(--ink-3)'}`,
                              background: isSelected ? 'var(--primary-700)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
              <div ref={sentinelCallbackRef} style={{ height: 1 }} />
              {isFetchingNextPage && (
                <div style={{ textAlign: 'center', padding: '16px', fontSize: fs(13), color: 'var(--ink-3)' }}>
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
          <p style={{ fontSize: fs(14), color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
            아직 등록된 설교가 없습니다.
          </p>
        </div>
      )}

      {selectMode && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--white)', borderTop: '1px solid var(--divider)',
          padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center',
          zIndex: 50,
        }}>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1.5px solid var(--divider)',
              background: 'var(--surface-0)', fontSize: fs(14), fontWeight: 600,
              color: 'var(--ink-1)', cursor: 'pointer', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {selected.size === allVideos.length && allVideos.length > 0 ? '선택 해제' : '보이는 항목 전체 선택'}
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={selected.size === 0}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: selected.size > 0 ? 'var(--primary-700)' : 'var(--surface-2)',
              color: selected.size > 0 ? 'white' : 'var(--ink-3)',
              border: 'none', fontSize: fs(14), fontWeight: 700,
              cursor: selected.size > 0 ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {selected.size > 0 ? `${selected.size}개 다운로드` : '다운로드'}
          </button>
        </div>
      )}

      {/* 2개 이상 동시 다운로드 시: 화면 딤 + 진행 표시 + 중앙 취소 (다른 조작 차단) */}
      {bulkState && bulkState.total >= 2 && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px' }} className="animate-spin">
              <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: fs(17), fontWeight: 700, marginBottom: 6 }}>다운로드 중입니다</p>
            <p style={{ fontSize: fs(14), opacity: 0.85 }}>{bulkState.done} / {bulkState.total}</p>
          </div>
          <button
            onClick={handleBulkCancel}
            style={{
              padding: '12px 32px', borderRadius: 10,
              background: 'var(--white)', color: 'var(--error, #d92d20)',
              border: 'none', fontSize: fs(15), fontWeight: 700, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            취소
          </button>
          <p style={{ fontSize: fs(12), color: 'rgba(255,255,255,0.6)' }}>취소하면 받은 항목도 모두 삭제됩니다</p>
        </div>
      )}
    </div>
  )
}
