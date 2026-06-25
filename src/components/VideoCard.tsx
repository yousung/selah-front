import { useState } from 'react'
import { usePlaylistStore } from '@/store/playlistStore'
import { useCachedMediaStore } from '@/store/cachedMediaStore'
import { useSettingsStore } from '@/store/settingsStore'
import { fs } from '@/lib/fontScale'
import PlaylistBottomSheet from './PlaylistBottomSheet'
import HighlightText from './HighlightText'
import Thumb from '@/components/Thumb'


interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  type?: string | null
  chapter?: number | null
  hymnTitle?: string | null
  publishedAt?: string | null
  duration?: number | null
  viewCount?: number | null
  likeCount?: number | null
  lyricLine?: string | null
}

interface Props {
  video: Video
  onClick: () => void
  layout?: 'card' | 'list'
  highlight?: string
  isDownloading?: boolean
  selectMode?: boolean
}


function fmtDuration(s?: number | null) {
  if (!s || s <= 0) return null
  const total = Math.floor(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }
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

function isNewVideo(publishedAt?: string | null) {
  if (!publishedAt) return false
  const diff = Date.now() - new Date(publishedAt).getTime()
  return diff <= 7 * 24 * 60 * 60 * 1000
}

function NewBadge() {
  return (
    <span
      className="absolute top-1.5 right-1.5 text-white text-[9px] font-bold px-1.5 rounded select-none"
      style={{ background: 'var(--accent-500)', lineHeight: fs(16), letterSpacing: '0.04em' }}
    >
      NEW
    </span>
  )
}

function CachedBadge() {
  return (
    <span
      className="absolute bottom-1 left-1 flex items-center justify-center rounded-full"
      style={{ width: 18, height: 18, background: 'rgba(61,107,68,0.88)' }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 1v6M4 5l2 2 2-2" />
        <line x1="1" y1="10" x2="11" y2="10" />
      </svg>
    </span>
  )
}

function DownloadingBadge() {
  return (
    <span
      className="absolute bottom-1 left-1 flex items-center justify-center rounded-full"
      style={{ width: 18, height: 18, background: 'rgba(0,0,0,0.55)' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" fill="none"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
        </path>
      </svg>
    </span>
  )
}

function ChapterBadge({ chapter, type }: { chapter: number; type?: string | null }) {
  const isHymn = type !== 'SERMON'
  const label = isHymn
    ? `${chapter}장`
    : chapter === 0 ? '서론' : String(chapter)
  return (
    <span
      className="absolute top-1.5 left-1.5 text-white text-[10px] font-bold px-1.5 rounded"
      style={{
        background: 'rgba(40,40,40,0.82)',
        lineHeight: fs(17),
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  )
}

function stripBrackets(s: string) {
  return s.replace(/\[.*?\]/g, '').trim()
}

export default function VideoCard({ video, onClick, layout = 'card', highlight, isDownloading, selectMode }: Props) {
  const isInAnyPlaylist = usePlaylistStore((s) => s.isInAnyPlaylist)
  const inPlaylist = isInAnyPlaylist(video.id)
  // 현재 미디어 모드(오디오/비디오)로 저장된 것만 "저장됨" 표시 (키 분리)
  const mediaMode = useSettingsStore((s) => s.mediaMode)
  const isCached = useCachedMediaStore((s) => s.cachedIds.has(`${video.id}-${mediaMode}`))
  const isNew = isNewVideo(video.publishedAt)
  const [sheetOpen, setSheetOpen] = useState(false)
  const dur = fmtDuration(video.duration ?? undefined)
  const views = fmtCompactCount(video.viewCount)
  const likes = fmtReactionCount(video.likeCount)
  const mainTitle = video.hymnTitle
    ? (video.tag ? `[${video.tag.toUpperCase()}] ${video.hymnTitle}` : video.hymnTitle)
    : ''
  const subTitle = video.title ? stripBrackets(video.title) : ''

  const handlePlaylist = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSheetOpen(true)
  }

  if (layout === 'list') {
    return (
      <>
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
            <Thumb
              src={video.thumbnail}
              className="w-full h-full object-cover"
              fallback={<div className="w-full h-full flex items-center justify-center text-xl" style={{ color: 'var(--ink-3)' }}>♪</div>}
            />
            {video.chapter != null && <ChapterBadge chapter={video.chapter} type={video.type} />}
            {isNew && <NewBadge />}
            {isCached ? <CachedBadge /> : isDownloading ? <DownloadingBadge /> : null}
            {dur && (
              <span className="absolute bottom-1 right-1 text-white text-[10px] font-semibold px-1 rounded"
                style={{ background: 'rgba(0,0,0,0.75)', lineHeight: fs(16) }}>{dur}</span>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0 py-0.5">
            <p className="line-clamp-1 text-sm lg:text-base font-medium leading-snug" style={{ color: 'var(--ink-0)' }}>
              <HighlightText text={mainTitle} query={highlight} />
            </p>
            {subTitle && (
              <p className="line-clamp-1 text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                <HighlightText text={subTitle} query={highlight} />
              </p>
            )}
            {(views || likes) && (
              <div className="flex items-center gap-2 mt-1">
                {views && <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>조회 {views}</span>}
                {likes && <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>좋아요 {likes}</span>}
              </div>
            )}
          </div>

          {/* Playlist button */}
          {selectMode
            ? <div className="flex-shrink-0" style={{ width: 40 }} />
            : (
              <button onClick={handlePlaylist} className="flex-shrink-0 p-1.5 transition-transform hover:scale-110" style={{ color: inPlaylist ? 'var(--accent-500)' : 'var(--ink-3)', fontSize: 18 }}>
                {inPlaylist ? '★' : '☆'}
              </button>
            )
          }
        </div>
        {sheetOpen && <PlaylistBottomSheet videoId={video.id} videoTitle={video.title} videoThumbnail={video.thumbnail} videoTag={video.tag} videoHymnTitle={video.hymnTitle} videoDuration={video.duration} onClose={() => setSheetOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <div
        className="cursor-pointer overflow-hidden transition-all duration-200 active:scale-[0.97]"
        onClick={onClick}
      >
        <div className="relative rounded-[10px] overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--surface-2)' }}>
          <Thumb
            src={video.thumbnail}
            className="w-full h-full object-cover"
            fallback={<div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: 'var(--ink-3)' }}>♪</div>}
          />
          {video.chapter != null && <ChapterBadge chapter={video.chapter} type={video.type} />}
          {isNew && <NewBadge />}
          {isCached && <CachedBadge />}
          {dur && (
            <span className="absolute bottom-1.5 right-1.5 text-white font-semibold rounded"
              style={{ fontSize: fs(11), background: 'rgba(0,0,0,0.78)', padding: '1px 5px', lineHeight: fs(18) }}>{dur}</span>
          )}
        </div>
        <div className="pt-2 pb-1">
          <p className="line-clamp-1 text-sm font-medium leading-snug" style={{ color: 'var(--ink-0)' }}>
            <HighlightText text={mainTitle} query={highlight} />
          </p>
          {subTitle && (
            <p className="line-clamp-1 text-[11px] mt-0.5" style={{ color: 'var(--ink-2)' }}>
              <HighlightText text={subTitle} query={highlight} />
            </p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2">
              {views && <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{views}</span>}
              {likes && <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>좋아요 {likes}</span>}
              {!views && !likes && <span />}
            </div>
            <button
              onClick={handlePlaylist}
              className="p-0.5 transition-transform hover:scale-110"
              style={{ fontSize: 14, color: inPlaylist ? 'var(--accent-500)' : 'var(--ink-3)' }}
            >
              {inPlaylist ? '★' : '☆'}
            </button>
          </div>
        </div>
      </div>
      {sheetOpen && <PlaylistBottomSheet videoId={video.id} videoTitle={video.title} videoThumbnail={video.thumbnail} videoTag={video.tag} videoHymnTitle={video.hymnTitle} videoDuration={video.duration} onClose={() => setSheetOpen(false)} />}
    </>
  )
}
