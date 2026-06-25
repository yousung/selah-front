import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudio } from '@/contexts/AudioContext'
import { usePlaylistStore, PlaylistVideo } from '@/store/playlistStore'
import { useQueueStore } from '@/store/queueStore'
import { setSelahMenu } from '@/lib/selahMenu'
function stripBrackets(s: string) {
  return s.replace(/\[.*?\]/g, '').trim()
}

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'


interface SortableItemProps {
  video: PlaylistVideo
  index: number
  onPlay: () => void
  onRemove: () => void
}

function SortableItem({ video, index, onPlay, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: video.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--divider)',
      }}
      className="flex items-center gap-3 px-4 py-3"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 flex items-center justify-center p-1 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--ink-3)', touchAction: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="18" x2="16" y2="18" />
        </svg>
      </div>

      <span className="flex-shrink-0 text-xs w-4 text-right" style={{ color: 'var(--ink-3)' }}>{index + 1}</span>

      {/* Thumbnail */}
      <div
        className="flex-shrink-0 rounded-[6px] overflow-hidden flex items-center justify-center cursor-pointer"
        style={{ width: 56, height: 40, background: 'var(--surface-2)' }}
        onClick={onPlay}
      >
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: 'var(--ink-3)', fontSize: 16 }}>♪</span>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className="line-clamp-1 text-sm font-medium leading-snug" style={{ color: 'var(--ink-0)' }}>
          {video.hymnTitle
            ? (video.tag ? `[${video.tag.toUpperCase()}] ${video.hymnTitle}` : video.hymnTitle)
            : stripBrackets(video.title)}
        </p>
        {video.hymnTitle && video.title && (
          <p className="line-clamp-1 text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            {stripBrackets(video.title)}
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 transition-opacity hover:opacity-60"
        style={{ color: 'var(--ink-3)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export default function MyPlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playVideo } = useAudio()
  const setQueue = useQueueStore((s) => s.setQueue)
  const { playlists, removeVideoFromPlaylist, reorderVideos, renamePlaylist, removePlaylist } = usePlaylistStore()
  const playlist = playlists.find((p) => p.id === id)

  const [renameMode, setRenameMode] = useState(false)
  const [renameValue, setRenameValue] = useState(playlist?.name ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !playlist || !id) return
    const videos = playlist.videos
    const oldIndex = videos.findIndex((v) => v.id === active.id)
    const newIndex = videos.findIndex((v) => v.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    reorderVideos(id, arrayMove(videos, oldIndex, newIndex))
  }

  const buildQueueMetas = (videos: PlaylistVideo[]) =>
    videos.map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail, tag: v.tag, hymnTitle: v.hymnTitle ?? null, duration: v.duration ?? null }))

  const handlePlayAll = () => {
    if (!playlist || playlist.videos.length === 0) return
    const ids = playlist.videos.map((v) => v.id)
    setQueue(ids, 0, buildQueueMetas(playlist.videos))
    const first = playlist.videos[0]
    setSelahMenu(`/my-playlists/${playlist.id}`)
    playVideo({ id: first.id, title: first.title, thumbnail: first.thumbnail, tag: first.tag, hymnTitle: first.hymnTitle, duration: first.duration })
    navigate(`/player/${first.id}`)
  }

  const handlePlay = (video: PlaylistVideo) => {
    if (!playlist) return
    const ids = playlist.videos.map((v) => v.id)
    const idx = ids.indexOf(video.id)
    setQueue(ids, idx, buildQueueMetas(playlist.videos))
    setSelahMenu(`/my-playlists/${playlist.id}`)
    playVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag, hymnTitle: video.hymnTitle, duration: video.duration })
    navigate(`/player/${video.id}`)
  }

if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>플레이리스트를 찾을 수 없어요</p>
        <button onClick={() => navigate('/my-playlists')} className="mt-4 text-sm" style={{ color: 'var(--primary-700)' }}>
          목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center px-2"
        style={{ minHeight: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <button onClick={() => navigate('/my-playlists')} className="p-2 flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 mx-2">
          {renameMode ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                if (renameValue.trim()) renamePlaylist(playlist.id, renameValue.trim())
                else setRenameValue(playlist.name)
                setRenameMode(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renameValue.trim()) renamePlaylist(playlist.id, renameValue.trim())
                  else setRenameValue(playlist.name)
                  setRenameMode(false)
                }
                if (e.key === 'Escape') { setRenameValue(playlist.name); setRenameMode(false) }
              }}
              className="w-full text-sm font-semibold outline-none"
              style={{ background: 'transparent', color: 'var(--ink-0)', borderBottom: '1px solid var(--primary-700)' }}
            />
          ) : (
            <h1
              className="text-sm font-semibold truncate cursor-pointer"
              style={{ color: 'var(--ink-0)' }}
              onClick={() => { setRenameValue(playlist.name); setRenameMode(true) }}
            >
              {playlist.name}
            </h1>
          )}
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{playlist.videos.length}개</p>
        </div>
        <button onClick={() => setConfirmDelete(true)} className="p-2" style={{ color: 'var(--ink-3)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </button>
      </header>

      {/* Controls bar */}
      {playlist.videos.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-opacity active:opacity-80"
            style={{ background: 'var(--primary-700)', color: 'var(--white)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            전체재생
          </button>
        </div>
      )}

      {/* Empty state */}
      {playlist.videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="text-4xl mb-4" style={{ color: 'var(--ink-3)' }}>♪</div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink-1)' }}>아직 영상이 없어요</p>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>영상의 별 아이콘을 눌러 추가해 보세요</p>
        </div>
      )}

      {/* Sortable list */}
      {playlist.videos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={playlist.videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1">
              {playlist.videos.map((video, index) => (
                <SortableItem
                  key={video.id}
                  video={video}
                  index={index}
                  onPlay={() => handlePlay(video)}
                  onRemove={() => removeVideoFromPlaylist(video.id, playlist.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: 'var(--white)', maxWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4">
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--ink-0)' }}>플레이리스트 삭제</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>"{playlist.name}"을 삭제할까요? 영상은 삭제되지 않아요.</p>
            </div>
            <div className="flex" style={{ borderTop: '1px solid var(--divider)' }}>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3.5 text-sm font-medium" style={{ color: 'var(--ink-1)', borderRight: '1px solid var(--divider)' }}>
                취소
              </button>
              <button
                onClick={() => { removePlaylist(playlist.id); navigate('/my-playlists') }}
                className="flex-1 py-3.5 text-sm font-semibold"
                style={{ color: 'var(--accent-500)' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
