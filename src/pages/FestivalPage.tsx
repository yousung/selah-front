import { useParams, useNavigate } from 'react-router-dom'
import VideoCard from '@/components/VideoCard'
import FestivalYearChips from '@/components/FestivalYearChips'
import { useBulkDownload } from '@/lib/useBulkDownload'
import { BulkDownloadToggle, BulkSelectMark, BulkDownloadOverlay } from '@/components/BulkDownload'
import { useFestivals, useFestival, usePlayHymn, toFestivalPlaylist } from '@/lib/hymnPlaylists'

export default function FestivalPage() {
  const { year: yearParam } = useParams<{ year: string }>()
  const navigate = useNavigate()
  const playHymn = usePlayHymn()
  const bulk = useBulkDownload()
  const year = Number(yearParam)
  const validYear = Number.isInteger(year) ? year : undefined

  const { data: festivals } = useFestivals()
  const { data: festival, isLoading, isError } = useFestival(validYear)
  const playlist = festival ? toFestivalPlaylist(festival) : null
  const selectableIds = (playlist?.videos ?? []).filter(bulk.pickable).map((v) => v.id)

  return (
    <div className="animate-fade-in" style={{ paddingBottom: bulk.selectMode ? 80 : 16 }}>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 safe-top"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center gap-3 px-3" style={{ minHeight: 56 }}>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full"
            style={{ color: 'var(--ink-0)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium truncate" style={{ color: 'var(--ink-0)' }}>
              {yearParam} 시편 찬송 모임
            </h1>
            {playlist && (
              <p className="text-xs" style={{ color: 'var(--ink-2)' }}>총 {playlist.videos.length}팀 · 주님의 교회</p>
            )}
          </div>
          <div className="flex-shrink-0 mr-1"><BulkDownloadToggle bulk={bulk} /></div>
        </div>
        {festivals && validYear != null && festivals.length > 1 && (
          <div className="px-4 pb-3">
            <FestivalYearChips
              festivals={festivals}
              year={validYear}
              onChange={(y) => navigate(`/festival/${y}`, { replace: true })}
            />
          </div>
        )}
      </header>

      <div className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
        ) : playlist?.videos.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
            {playlist.videos.map((v) => (
              <div key={v.id} style={{ position: 'relative' }}>
                <VideoCard
                  video={v}
                  onClick={bulk.selectMode ? () => { if (bulk.pickable(v)) bulk.toggleSelect(v.id) } : () => playHymn(v, playlist)}
                  layout="card"
                  isDownloading={bulk.downloadingIds.has(v.id)}
                  selectMode={bulk.selectMode}
                />
                {bulk.selectMode && bulk.pickable(v) && (
                  <BulkSelectMark selected={bulk.selected.has(v.id)} style={{ right: 8, top: 8, transform: 'none' }} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20">
            <span className="text-4xl mb-4">📭</span>
            <p className="text-sm" style={{ color: 'var(--ink-1)' }}>
              {isError || validYear == null ? '해당 연도의 시편 찬송 모임이 없어요.' : '등록된 영상이 없어요.'}
            </p>
          </div>
        )}
      </div>
      <BulkDownloadOverlay bulk={bulk} selectableIds={selectableIds} />
    </div>
  )
}
