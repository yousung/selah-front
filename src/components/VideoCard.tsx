import { useState } from 'react'
import { useFavoritesStore } from '@/store/favoritesStore'

interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  publishedAt?: string | null
  duration?: number | null
  viewCount?: number | null
  likeCount?: number | null
  dislikeCount?: number | null
  description?: string | null
}

interface Props {
  video: Video
  onClick: () => void
  layout?: 'card' | 'list'
}

function fmtDuration(s?: number | null) {
  if (!s || s <= 0) return null
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function fmtCompactCount(n?: number | null) {
  if (n == null || n <= 0) return null
  if (n >= 100000000) return `${Math.floor(n / 100000000)}억회`
  if (n >= 10000) return `${Math.floor(n / 10000)}만회`
  if (n >= 1000) return `${Math.floor(n / 1000)}천회`
  return `${n}회`
}

function fmtReactionCount(n?: number | null) {
  return fmtCompactCount(n)?.replace(/회$/, '')
}

function TagLine({ tag }: { tag: string }) {
  if (tag === 'AR') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#3D6B44' }}>
        <span style={{ fontSize: 8, lineHeight: 1 }}>●</span> AR
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#3A3A3A' }}>
      <span style={{ fontSize: 8, lineHeight: 1 }}>■</span> MR
    </span>
  )
}

export default function VideoCard({ video, onClick, layout = 'card' }: Props) {
  const { has, toggle } = useFavoritesStore()
  const isFav = has(video.id)
  const [imgErr, setImgErr] = useState(false)
  const dur = fmtDuration(video.duration)
  const views = fmtCompactCount(video.viewCount)
  const likes = fmtReactionCount(video.likeCount)

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggle(video.id)
  }

  if (layout === 'list') {
    return (
      <div
        className="flex items-start gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-4 cursor-pointer transition-colors"
        onClick={onClick}
        style={{ borderBottom: '1px solid var(--divider)' }}
      >
        {/* Thumbnail */}
        <div
          className="relative flex-shrink-0 rounded-[8px] overflow-hidden"
          style={{ background: 'var(--surface-2)', width: 'clamp(80px, 22vw, 140px)', aspectRatio: '16/9' }}
        >
          {video.thumbnail && !imgErr ? (
            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl" style={{ color: 'var(--ink-3)' }}>♪</div>
          )}
          {dur && (
            <span
              className="absolute bottom-1 right-1 text-white text-[10px] font-semibold px-1 rounded"
              style={{ background: 'rgba(0,0,0,0.75)', lineHeight: '16px' }}
            >
              {dur}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0 py-0.5">
          <p className="line-clamp-1 text-sm lg:text-base font-medium leading-snug" style={{ color: 'var(--ink-0)' }}>
            {video.title}
          </p>
          {video.description && (
            <p className="line-clamp-1 text-xs mt-0.5 leading-snug" style={{ color: 'var(--ink-2)' }}>
              {video.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {video.tag && <TagLine tag={video.tag} />}
            {views && <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>조회 {views}</span>}
            {likes && <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>좋아요 {likes}</span>}
          </div>
        </div>

        {/* Fav */}
        <button onClick={handleFav} className="flex-shrink-0 p-1.5 transition-transform hover:scale-110" style={{ color: isFav ? 'var(--accent-500)' : 'var(--ink-3)', fontSize: 18 }}>
          {isFav ? '★' : '☆'}
        </button>
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer overflow-hidden transition-all duration-200 active:scale-[0.97]"
      onClick={onClick}
    >
      <div className="relative rounded-[10px] overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--surface-2)' }}>
        {video.thumbnail && !imgErr ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--ink-3)' }}>♪</div>
        )}
        {dur && (
          <span
            className="absolute bottom-1.5 right-1.5 text-white font-semibold rounded"
            style={{ fontSize: 11, background: 'rgba(0,0,0,0.78)', padding: '1px 5px', lineHeight: '18px' }}
          >
            {dur}
          </span>
        )}
      </div>
      <div className="pt-2 pb-1">
        <p className="line-clamp-1 text-sm font-medium leading-snug" style={{ color: 'var(--ink-0)' }}>{video.title}</p>
        {video.description && (
          <p className="line-clamp-1 text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>{video.description}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            {video.tag && <TagLine tag={video.tag} />}
            {views && <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{views}</span>}
            {likes && <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>좋아요 {likes}</span>}
          </div>
          <button
            onClick={handleFav}
            className="p-0.5 transition-transform hover:scale-110"
            style={{ fontSize: 14, color: isFav ? 'var(--accent-500)' : 'var(--ink-3)' }}
          >
            {isFav ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  )
}
