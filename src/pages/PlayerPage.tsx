import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAudio } from '@/contexts/AudioContext'
import { useFavoritesStore } from '@/store/favoritesStore'
import { useSettingsStore } from '@/store/settingsStore'
import TagBadge from '@/components/TagBadge'

interface Video {
  id: string
  title: string
  thumbnail: string | null
  tag: string | null
  playlist?: { id: string; title: string }
}

interface Lyric {
  chapter?: number | null
  reference?: string | null
  hymnTitle?: string | null
  verseCount?: number | null
  verse1?: string | null
  verse2?: string | null
  verse3?: string | null
  verse4?: string | null
  verse5?: string | null
  verse6?: string | null
  verse7?: string | null
  verse8?: string | null
  verse9?: string | null
  verse10?: string | null
  verse11?: string | null
  verse12?: string | null
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}


function LyricsSection({ lyric }: { lyric?: Lyric | null }) {
  if (!lyric) return null
  const verses = [
    lyric.verse1, lyric.verse2, lyric.verse3, lyric.verse4,
    lyric.verse5, lyric.verse6, lyric.verse7, lyric.verse8,
    lyric.verse9, lyric.verse10, lyric.verse11, lyric.verse12,
  ].filter(Boolean) as string[]
  if (verses.length === 0) return null

  return (
    <section className="mt-8 pt-5" style={{ borderTop: '1px solid var(--divider)' }}>
      {lyric.hymnTitle && (
        <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--ink-1)' }}>{lyric.hymnTitle}</p>
      )}
      {lyric.reference && (
        <p className="text-xs mb-4 text-center" style={{ color: 'var(--ink-2)' }}>{lyric.reference}</p>
      )}
      <div className="space-y-5">
        {verses.map((v, i) => (
          <div key={i}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--ink-3)' }}>{i + 1}절</p>
            <p className="text-sm leading-[1.9] whitespace-pre-line" style={{ color: 'var(--ink-1)' }}>{v}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { has, toggle } = useFavoritesStore()
  const autoPlayOnDetail = useSettingsStore((s) => s.autoPlayOnDetail)
  const { currentVideo, isPlaying, isLoading, position, duration, error, playVideo, togglePlay, seek, seekBy } = useAudio()
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [imgErr, setImgErr] = useState(false)

  const { data: video } = useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      const { data } = await api.get<Video>(`/videos/${id}`)
      return data
    },
    enabled: !!id,
  })

  const { data: lyric } = useQuery({
    queryKey: ['lyric', id],
    queryFn: async () => {
      const { data } = await api.get<Lyric | null>(`/videos/${id}/lyrics`)
      return data
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!video) return
    if (currentVideo?.id !== video.id) {
      playVideo(
        { id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag },
        { autoPlay: autoPlayOnDetail },
      )
    }
  }, [autoPlayOnDetail, currentVideo?.id, playVideo, video])

  const handleRetry = useCallback(() => {
    if (video) playVideo({ id: video.id, title: video.title, thumbnail: video.thumbnail, tag: video.tag })
  }, [video])

  const progress = dragValue !== null ? dragValue : (duration > 0 ? position / duration : 0)
  const isFav = id ? has(id) : false

  /* ── Shared sub-components ── */
  const Artwork = (
    <div
      className="rounded-[20px] overflow-hidden shadow-sm"
      style={{
        aspectRatio: '16/9',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--surface-2)',
        border: '1px solid var(--divider)',
      }}
    >
      {video?.thumbnail && !imgErr ? (
        <img src={video.thumbnail} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--ink-3)' }}>🎵</div>
      )}
    </div>
  )

  const Controls = (
    <div className="flex flex-col">
      {/* Title + Tag */}
      <div className="mb-6">
        {video ? (
          <>
            <h1 className="serif text-xl font-medium leading-[1.5] text-center mb-2" style={{ color: 'var(--ink-0)' }}>
              {video.title}
            </h1>
            <div className="flex items-center justify-center gap-2">
              {video.tag && <TagBadge tag={video.tag} size="md" />}
              {video.playlist && (
                <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{video.playlist.title}</span>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="h-6 rounded mx-auto" style={{ background: 'var(--surface-2)', width: '70%' }} />
            <div className="h-4 rounded mx-auto" style={{ background: 'var(--surface-2)', width: '40%' }} />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 text-center">
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          <button className="text-sm mt-2 underline" style={{ color: 'var(--primary-700)' }} onClick={handleRetry}>다시 시도</button>
        </div>
      )}

      {/* Seek bar */}
      <div className="mb-2">
        <input
          type="range" min={0} max={1} step={0.001} value={progress}
          onChange={(e) => setDragValue(Number(e.target.value))}
          onMouseUp={(e) => { seek((e.target as HTMLInputElement).valueAsNumber * duration); setDragValue(null) }}
          onTouchEnd={(e) => { seek((e.target as HTMLInputElement).valueAsNumber * duration); setDragValue(null) }}
          className="w-full"
          style={{ height: 3, accentColor: 'var(--primary-700)', cursor: 'pointer',
            background: `linear-gradient(to right, var(--primary-700) ${progress * 100}%, var(--divider) ${progress * 100}%)` }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>{fmtTime(position)}</span>
          <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Play controls */}
      <div className="flex items-center justify-center gap-8 mt-4">
        {/* -15s */}
        <button
          onClick={() => seekBy(-15)}
          className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-60 active:scale-95"
        >
          <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" style={{ color: 'var(--ink-1)' }}>
              <path d="M22 8 A14 14 0 1 0 36 22" />
              <polyline points="17,4 22,8 18,13" />
            </svg>
            <span className="absolute text-[10px] font-bold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.5px' }}>15</span>
          </div>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay} disabled={isLoading && !currentVideo}
          className="flex items-center justify-center rounded-full transition-all active:scale-95"
          style={{ width: 68, height: 68, background: 'var(--primary-700)', color: 'var(--white)', boxShadow: '0 4px 20px rgba(61,107,68,0.30)' }}
        >
          {isLoading ? (
            <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5v14l11-7L9 5z" /></svg>
          )}
        </button>

        {/* +15s */}
        <button
          onClick={() => seekBy(15)}
          className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-60 active:scale-95"
        >
          <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" style={{ color: 'var(--ink-1)' }}>
              <path d="M22 8 A14 14 0 1 1 8 22" />
              <polyline points="27,4 22,8 26,13" />
            </svg>
            <span className="absolute text-[10px] font-bold" style={{ color: 'var(--ink-1)', letterSpacing: '-0.5px' }}>15</span>
          </div>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-dvh animate-fade-in" style={{ background: 'var(--surface-0)' }}>
      {/* AppBar */}
      <header
        className="flex items-center justify-between px-2"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <button
          className="flex items-center gap-1 px-2 py-2 rounded-full transition-colors hover:bg-surface-1"
          style={{ color: 'var(--ink-0)' }}
          onClick={() => navigate(-1)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm">돌아가기</span>
        </button>
        <div className="flex items-center gap-2">
          {id && (
            <button onClick={() => toggle(id)} className="p-2 transition-transform hover:scale-110"
              style={{ fontSize: 20, color: isFav ? 'var(--accent-500)' : 'var(--ink-3)' }}>
              {isFav ? '★' : '☆'}
            </button>
          )}
        </div>
      </header>

      {/* Mobile / Tablet: single column */}
      <div className="lg:hidden flex-1 px-6 pt-6 pb-8 flex flex-col">
        <div className="mb-8">{Artwork}</div>
        {Controls}
        <LyricsSection lyric={lyric} />
      </div>

      {/* Desktop: two columns */}
      <div className="hidden lg:block flex-1 px-16 py-12" style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div className="flex items-center gap-12">
          <div className="flex-1">{Artwork}</div>
          <div className="flex-1">{Controls}</div>
        </div>
        <LyricsSection lyric={lyric} />
      </div>
    </div>
  )
}
