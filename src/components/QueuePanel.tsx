import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAudio } from '@/contexts/AudioContext'
import { useQueueStore } from '@/store/queueStore'
import Thumb from '@/components/Thumb'
import { isPlayableInQueue, openLiveVideoInNewTab } from '@/lib/liveVideo'

function stripBrackets(s: string) {
  return s.replace(/\[.*?\]/g, '').trim()
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function QueuePanel({ isOpen, onClose }: Props) {
  const { currentVideo, isPlaying, playVideo, stop, togglePlay } = useAudio()
  const ids = useQueueStore((s) => s.ids)
  const videos = useQueueStore((s) => s.videos)
  const setQueue = useQueueStore((s) => s.setQueue)
  const navigate = useNavigate()

  const activeRef = useRef<HTMLDivElement>(null)
  const didScrollRef = useRef(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // 패널 열릴 때 한 번만 현재 곡으로 스크롤
  useEffect(() => {
    if (isOpen && !didScrollRef.current) {
      didScrollRef.current = true
      requestAnimationFrame(() => {
        setTimeout(() => {
          activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 80)
      })
    }
    if (!isOpen) {
      didScrollRef.current = false
      setSelected(new Set())
    }
  }, [isOpen])

  const allSelected = ids.length > 0 && ids.every(id => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(ids))
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleShuffle = () => {
    if (ids.length === 0) return
    const indices = ids.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    const newVideos = indices.map(i => videos[i]).filter((v) => v && isPlayableInQueue(v))
    const newIds = newVideos.map((v) => v.id)
    setQueue(newIds, 0, newVideos)
    const first = newVideos[0]
    if (first) {
      if (openLiveVideoInNewTab(first)) return
      void playVideo(
        { id: first.id, youtubeId: first.youtubeId ?? null, title: first.title, thumbnail: first.thumbnail, tag: first.tag ?? null, hymnTitle: first.hymnTitle ?? null, duration: first.duration, chapter: first.chapter ?? null, isSecret: first.isSecret ?? null, isLive: first.isLive ?? null },
        { autoPlay: true },
      )
      navigate(`/player/${first.id}`)
    }
  }

  const handleDeleteSelected = () => {
    if (!someSelected) return

    const isCurrentDeleted = !!currentVideo && selected.has(currentVideo.id)
    const currentIdx = currentVideo ? ids.indexOf(currentVideo.id) : -1

    // 다음에 재생할 곡 찾기 (현재 곡이 삭제될 때)
    let nextOriginalIdx = -1
    if (isCurrentDeleted && currentIdx >= 0) {
      // 앞쪽에서 찾기
      for (let i = currentIdx + 1; i < ids.length; i++) {
        if (!selected.has(ids[i])) { nextOriginalIdx = i; break }
      }
      // 뒤쪽에서 찾기
      if (nextOriginalIdx === -1) {
        for (let i = currentIdx - 1; i >= 0; i--) {
          if (!selected.has(ids[i])) { nextOriginalIdx = i; break }
        }
      }
    }

    const newVideos = videos.filter((v, i) => !selected.has(ids[i]) && isPlayableInQueue(v))
    const newIds = newVideos.map((v) => v.id)

    if (isCurrentDeleted) {
      if (nextOriginalIdx >= 0) {
        const nextId = ids[nextOriginalIdx]
        const newNextIdx = newIds.indexOf(nextId)
        const nextMeta = videos[nextOriginalIdx]
        setQueue(newIds, newNextIdx, newVideos)
        if (nextMeta) {
          if (openLiveVideoInNewTab(nextMeta)) return
          void playVideo(
            { id: nextMeta.id, youtubeId: nextMeta.youtubeId ?? null, title: nextMeta.title, thumbnail: nextMeta.thumbnail, tag: nextMeta.tag ?? null, hymnTitle: nextMeta.hymnTitle ?? null, duration: nextMeta.duration, chapter: nextMeta.chapter ?? null, isSecret: nextMeta.isSecret ?? null, isLive: nextMeta.isLive ?? null },
            { autoPlay: true },
          )
          navigate(`/player/${nextId}`)
        }
      } else {
        // 남은 곡 없음
        setQueue(newIds, -1, newVideos)
        stop()
      }
    } else {
      // 현재 곡은 유지 — 새 index 계산
      const newCurrentIdx = currentVideo ? newIds.indexOf(currentVideo.id) : -1
      setQueue(newIds, newCurrentIdx, newVideos)
    }

    setSelected(new Set())
  }

  const handleItemClick = (idx: number) => {
    const id = ids[idx]
    const meta = videos[idx]
    // 현재 재생 중인 곡 클릭 → 재생/일시정지 토글
    if (currentVideo?.id === id) {
      togglePlay()
      return
    }
    setQueue(ids, idx)
    if (meta) {
      if (openLiveVideoInNewTab(meta)) return
      void playVideo(
        { id: meta.id, youtubeId: meta.youtubeId ?? null, title: meta.title, thumbnail: meta.thumbnail, tag: meta.tag ?? null, hymnTitle: meta.hymnTitle ?? null, duration: meta.duration, chapter: meta.chapter ?? null, isSecret: meta.isSecret ?? null, isLive: meta.isLive ?? null },
        { autoPlay: true },
      )
    }
    navigate(`/player/${id}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.45)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed left-0 right-0 z-50 flex flex-col"
        style={{
          bottom: 0,
          maxHeight: '72vh',
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 pt-3 pb-3"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <div
            className="mx-auto mb-3 rounded-full"
            style={{ width: 36, height: 4, background: 'var(--surface-2)' }}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-0)' }}>
              재생목록{' '}
              <span style={{ color: 'var(--ink-2)', fontWeight: 400 }}>
                ({ids.length}곡)
              </span>
            </p>
            <div className="flex items-center gap-1">
              {/* 전체선택 */}
              <button
                onClick={toggleAll}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
                style={{
                  color: allSelected ? 'var(--primary-700)' : 'var(--ink-2)',
                  background: allSelected ? 'var(--primary-50)' : 'transparent',
                }}
                aria-label="전체 선택/해제"
              >
                {allSelected ? (
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="3" fill="var(--primary-700)" />
                    <path d="M7 12l4 4 6-7" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth={2} />
                  </svg>
                )}
                전체
              </button>

              {/* 랜덤 재생 */}
              <button
                onClick={handleShuffle}
                disabled={ids.length === 0}
                className="flex items-center justify-center"
                style={{
                  color: ids.length > 0 ? 'var(--ink-2)' : 'var(--ink-3)',
                  opacity: ids.length > 0 ? 1 : 0.35,
                  width: 32,
                  height: 32,
                  cursor: ids.length > 0 ? 'pointer' : 'default',
                }}
                aria-label="랜덤 재생"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </button>

              {/* 선택 삭제 */}
              <button
                onClick={handleDeleteSelected}
                disabled={!someSelected}
                className="flex items-center justify-center"
                style={{
                  color: someSelected ? '#e53935' : 'var(--ink-3)',
                  opacity: someSelected ? 1 : 0.35,
                  width: 32,
                  height: 32,
                  cursor: someSelected ? 'pointer' : 'default',
                }}
                aria-label="선택한 곡 삭제"
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>

              {/* 닫기 */}
              <button
                onClick={onClose}
                className="flex items-center justify-center"
                style={{ color: 'var(--ink-3)', width: 32, height: 32 }}
                aria-label="닫기"
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1" style={{ paddingBottom: 16 }}>
          {ids.map((id, idx) => {
            const meta = videos[idx]
            const isActive = currentVideo?.id === id
            const isSelected = selected.has(id)
            return (
              <div
                key={id}
                ref={isActive ? activeRef : undefined}
                className="flex items-center gap-3 transition-colors"
                style={{
                  padding: '10px 16px',
                  background: isSelected
                    ? 'rgba(61,107,68,0.08)'
                    : isActive
                    ? 'var(--primary-50)'
                    : 'transparent',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(id)}
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 20, height: 20 }}
                  aria-label={isSelected ? '선택 해제' : '선택'}
                >
                  {isSelected ? (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="3" fill="var(--primary-700)" />
                      <path d="M7 12l4 4 6-7" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--ink-3)" strokeWidth={1.8} />
                    </svg>
                  )}
                </button>

                {/* Thumbnail */}
                <div
                  className="flex-shrink-0 rounded-[6px] overflow-hidden relative cursor-pointer"
                  style={{ width: 60, height: 38, background: 'var(--surface-2)' }}
                  onClick={() => handleItemClick(idx)}
                >
                  <Thumb
                    src={meta?.thumbnail}
                    className="w-full h-full object-cover"
                    fallback={
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                    }
                  />
                  {/* 재생 중 오버레이 */}
                  {isActive && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(61,107,68,0.65)' }}
                    >
                      {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {/* Title */}
                <p
                  className="flex-1 min-w-0 text-sm line-clamp-2 leading-snug cursor-pointer"
                  style={{
                    color: isActive ? 'var(--primary-700)' : 'var(--ink-0)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onClick={() => handleItemClick(idx)}
                >
                  {meta ? stripBrackets(meta.title) : id}
                </p>

                {/* 재생 중 점 */}
                {isActive && !isSelected && (
                  <div
                    className="flex-shrink-0 rounded-full"
                    style={{ width: 7, height: 7, background: 'var(--primary-700)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
