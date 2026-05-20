import { useNavigate } from 'react-router-dom'
import { useAudio } from '@/contexts/AudioContext'

function fmtTime(s: number) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface Props {
  onDismiss?: () => void
}

export default function MiniPlayer({ onDismiss }: Props) {
  const { currentVideo, isPlaying, isLoading, position, duration, togglePlay } = useAudio()
  const navigate = useNavigate()

  if (!currentVideo) return null

  const progress = duration > 0 ? (position / duration) * 100 : 0

  return (
    <div
      className="animate-fade-up overflow-hidden"
      style={{
        background: 'var(--white)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--surface-2)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--primary-700)',
            transition: 'width 0.5s linear',
          }}
        />
      </div>

      <div
        className="flex items-center gap-3 px-4 cursor-pointer"
        style={{ height: 68 }}
        onClick={() => navigate(`/player/${currentVideo.id}`)}
      >
        {/* Thumbnail */}
        <div
          className="rounded-[8px] overflow-hidden flex-shrink-0"
          style={{ width: 44, height: 44, background: 'var(--surface-2)' }}
        >
          {currentVideo.thumbnail ? (
            <img src={currentVideo.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg" style={{ color: 'var(--ink-3)' }}>♪</div>
          )}
        </div>

        {/* Title + time */}
        <div className="flex-1 min-w-0">
          <p className="line-clamp-1 text-sm font-semibold" style={{ color: 'var(--ink-0)' }}>{currentVideo.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            {fmtTime(position)} / {fmtTime(duration)}
          </p>
        </div>

        {/* Play/pause */}
        <button
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-all"
          style={{ width: 38, height: 38, background: 'var(--primary-700)', color: 'var(--white)' }}
          onClick={(e) => { e.stopPropagation(); togglePlay() }}
        >
          {isLoading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : isPlaying ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>

        {/* Dismiss */}
        {onDismiss && (
          <button
            className="flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-60"
            style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
            onClick={(e) => { e.stopPropagation(); onDismiss() }}
            aria-label="닫기"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
