import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlaylistStore, UserPlaylist } from '@/store/playlistStore'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="text-5xl mb-4" style={{ color: 'var(--ink-3)' }}>☆</div>
      <p className="text-base font-medium mb-1" style={{ color: 'var(--ink-1)' }}>플레이리스트가 없어요</p>
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        영상의 별 아이콘을 눌러<br />내 플레이리스트에 추가해 보세요
      </p>
    </div>
  )
}

interface RenameSheetProps {
  playlist: UserPlaylist
  onDone: (name: string) => void
  onClose: () => void
}

function RenameSheet({ playlist, onDone, onClose }: RenameSheetProps) {
  const [name, setName] = useState(playlist.name)

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full rounded-t-2xl overflow-hidden"
        style={{ background: 'var(--white)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="rounded-full" style={{ width: 36, height: 4, background: 'var(--divider)' }} />
        </div>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)' }}>이름 변경</h2>
        </div>
        <div className="px-4 py-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onDone(name.trim()); onClose() } }}
            className="w-full text-sm outline-none"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--divider)',
              borderRadius: 10,
              padding: '10px 14px',
              color: 'var(--ink-0)',
            }}
          />
        </div>
        <div
          className="px-4 pb-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => { if (name.trim()) { onDone(name.trim()); onClose() } }}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity active:opacity-80"
            style={{ background: name.trim() ? 'var(--primary-700)' : 'var(--surface-2)', color: name.trim() ? 'var(--white)' : 'var(--ink-3)' }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MyPlaylistsPage() {
  const navigate = useNavigate()
  const { playlists, removePlaylist, renamePlaylist } = usePlaylistStore()
  const [renaming, setRenaming] = useState<UserPlaylist | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 flex items-center"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-semibold" style={{ color: 'var(--ink-0)' }}>내 플레이리스트</h1>
        <span className="ml-2 text-sm" style={{ color: 'var(--ink-3)' }}>
          {playlists.length > 0 ? `${playlists.length}개` : ''}
        </span>
      </header>

      {playlists.length === 0 ? (
        <EmptyState />
      ) : (
        <ul>
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-center px-4 py-4 cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid var(--divider)' }}
              onClick={() => navigate(`/my-playlists/${p.id}`)}
            >
              {/* Playlist icon */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-lg mr-3"
                style={{ width: 44, height: 44, background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: 20 }}
              >
                ♪
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-0)' }}>{p.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>영상 {p.videos.length}개</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setRenaming(p)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDelete(p.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rename sheet */}
      {renaming && (
        <RenameSheet
          playlist={renaming}
          onDone={(name) => renamePlaylist(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: 'var(--white)', maxWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4">
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--ink-0)' }}>플레이리스트 삭제</p>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>이 플레이리스트를 삭제할까요? 영상은 삭제되지 않아요.</p>
            </div>
            <div className="flex" style={{ borderTop: '1px solid var(--divider)' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3.5 text-sm font-medium"
                style={{ color: 'var(--ink-1)', borderRight: '1px solid var(--divider)' }}
              >
                취소
              </button>
              <button
                onClick={() => { removePlaylist(confirmDelete); setConfirmDelete(null) }}
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
