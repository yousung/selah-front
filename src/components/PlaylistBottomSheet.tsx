import { useState, useEffect, useRef } from 'react'
import { usePlaylistStore } from '@/store/playlistStore'

interface Props {
  videoId: string
  videoYoutubeId?: string | null
  videoTitle: string
  videoThumbnail: string | null
  videoTag: string | null
  videoHymnTitle?: string | null
  videoDuration?: number | null
  videoIsLive?: boolean | string | null
  onClose: () => void
}

export default function PlaylistBottomSheet({ videoId, videoYoutubeId, videoTitle, videoThumbnail, videoTag, videoHymnTitle, videoDuration, videoIsLive, onClose }: Props) {
  const { playlists, addPlaylist, addVideoToPlaylists, removeVideoFromPlaylist, getPlaylistsForVideo } = usePlaylistStore()
  const initial = getPlaylistsForVideo(videoId)
  const [checked, setChecked] = useState<Set<string>>(new Set(initial))
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showNew) inputRef.current?.focus()
  }, [showNew])

  // close on backdrop tap
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const createAndCheck = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const id = addPlaylist(trimmed)
    setChecked((prev) => new Set([...prev, id]))
    setNewName('')
    setShowNew(false)
  }

  const handleDone = () => {
    // figure out diffs
    const before = new Set(initial)
    const after = checked

    // add to newly-checked playlists
    const toAdd = [...after].filter((id) => !before.has(id))
    if (toAdd.length) addVideoToPlaylists({ id: videoId, youtubeId: videoYoutubeId, title: videoTitle, thumbnail: videoThumbnail, tag: videoTag, hymnTitle: videoHymnTitle, duration: videoDuration, isLive: videoIsLive }, toAdd)

    // remove from unchecked playlists
    const toRemove = [...before].filter((id) => !after.has(id))
    toRemove.forEach((id) => removeVideoFromPlaylist(videoId, id))

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={handleBackdrop}
    >
      <div
        ref={sheetRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{ background: 'var(--white)', maxHeight: '60vh', maxWidth: 480, display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--divider)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)' }}>내 플레이리스트에 추가</h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--ink-2)', fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {playlists.length === 0 && !showNew && (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
              아직 플레이리스트가 없어요
            </p>
          )}
          {playlists.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid var(--divider)' }}
            >
              <input
                type="checkbox"
                checked={checked.has(p.id)}
                onChange={() => toggle(p.id)}
                className="w-4 h-4 accent-[var(--primary-700)] flex-shrink-0"
              />
              <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--ink-0)' }}>
                {p.name}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                {p.videos.length}개
              </span>
            </label>
          ))}

          {/* Inline new playlist */}
          {showNew ? (
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createAndCheck()
                  if (e.key === 'Escape') { setShowNew(false); setNewName('') }
                }}
                placeholder="플레이리스트 이름"
                className="flex-1 text-sm outline-none"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--divider)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--ink-0)',
                }}
              />
              <button
                onClick={createAndCheck}
                disabled={!newName.trim()}
                className="text-sm font-medium px-3 py-2 rounded-lg transition-opacity"
                style={{
                  background: newName.trim() ? 'var(--primary-700)' : 'var(--surface-2)',
                  color: newName.trim() ? 'var(--white)' : 'var(--ink-3)',
                }}
              >
                추가
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-3.5 w-full transition-colors"
              style={{ color: 'var(--primary-700)' }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              <span className="text-sm font-medium">새 플레이리스트 만들기</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          <button
            onClick={handleDone}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity active:opacity-80"
            style={{ background: 'var(--primary-700)', color: 'var(--white)' }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
