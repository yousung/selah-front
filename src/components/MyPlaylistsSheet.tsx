import { useNavigate } from 'react-router-dom'
import { usePlaylistStore } from '@/store/playlistStore'

interface Props {
  onClose: () => void
}

export default function MyPlaylistsSheet({ onClose }: Props) {
  const navigate = useNavigate()
  const playlists = usePlaylistStore((s) => s.playlists)

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSelect = (id: string) => {
    navigate(`/my-playlists/${id}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--white)',
          maxHeight: '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--divider)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)' }}>
            내 재생목록
            {playlists.length > 0 && (
              <span className="ml-1.5 text-sm font-normal" style={{ color: 'var(--ink-3)' }}>
                {playlists.length}개
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--ink-2)', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {playlists.length === 0 ? (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
              저장한 재생목록이 없어요
            </p>
          ) : (
            playlists.map((p) => (
              <button
                key={p.id}
                className="flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors active:opacity-70"
                style={{ borderBottom: '1px solid var(--divider)' }}
                onClick={() => handleSelect(p.id)}
              >
                {/* Playlist icon */}
                <div
                  className="flex items-center justify-center flex-shrink-0 rounded-lg"
                  style={{ width: 40, height: 40, background: 'var(--primary-50)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--primary-700)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="15" y2="18" />
                    <polyline points="17 15 21 18 17 21" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink-0)' }}>
                    {p.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {p.videos.length}곡
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))
          )}
        </div>

        {/* Bottom safe area spacer */}
        <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} className="flex-shrink-0" />
      </div>
    </div>
  )
}
