import { useNavigate, useParams } from 'react-router-dom'
import { fs } from '@/lib/fontScale'
import { fmtReadingDuration, readingCover, useReadingCategory, usePlayReading } from '@/lib/reading'
import { isLiveVideo, isSecretVideo } from '@/lib/liveVideo'
import { useBulkDownload } from '@/lib/useBulkDownload'
import { BulkDownloadToggle, BulkSelectMark, BulkDownloadOverlay } from '@/components/BulkDownload'

/** 독서 — 책 상세: 책 정보 + 회차 목록(readingOrder 순). 탭하면 이 책의 재생 가능 회차를 큐로 재생 */
export default function ReadingBookPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const playReading = usePlayReading()
  const { data: book, isLoading } = useReadingCategory(id)
  const videos = book?.videos ?? []
  const bulk = useBulkDownload()
  const selectableIds = videos.filter(bulk.pickable).map((v) => v.id)

  return (
    <div className="animate-fade-in" style={{ background: 'var(--surface-0)', paddingBottom: bulk.selectMode ? 80 : 16 }}>
      <header
        className="sticky top-0 z-10 safe-top"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div className="flex items-center gap-3 px-3" style={{ minHeight: 56 }}>
          <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ color: 'var(--ink-0)' }} aria-label="뒤로">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="flex-1 min-w-0 text-base font-medium truncate" style={{ color: 'var(--ink-0)' }}>{book?.title ?? '독서'}</h1>
          <div className="flex-shrink-0 pr-1"><BulkDownloadToggle bulk={bulk} show={videos.length > 0} /></div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        </div>
      ) : !book ? (
        <div className="flex flex-col items-center py-20">
          <span className="text-4xl mb-4">📭</span>
          <p className="text-sm" style={{ color: 'var(--ink-1)' }}>책을 찾을 수 없어요.</p>
        </div>
      ) : (
        <>
          <section style={{ padding: '20px 16px 16px', display: 'flex', gap: 16, alignItems: 'flex-start', background: 'var(--white)' }}>
            {readingCover(book.thumbnail, videos[0]?.thumbnail) && (
              <img
                src={readingCover(book.thumbnail, videos[0]?.thumbnail)!}
                alt=""
                style={{ width: 72, aspectRatio: '5 / 7', borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'var(--surface-2)' }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
              <h2 style={{ fontSize: fs(18), fontWeight: 700, lineHeight: 1.4, color: 'var(--ink-0)' }}>{book.title}</h2>
              {book.author && <p style={{ fontSize: fs(13), color: 'var(--ink-2)', marginTop: 4 }}>{book.author}</p>}
              <p style={{ fontSize: fs(12), color: 'var(--ink-3)', marginTop: 6 }}>
                {book.videoCount}편{book.isCompleted ? ' · 완료' : ''}
              </p>
            </div>
          </section>
          {book.description && (
            <p
              className="whitespace-pre-line"
              style={{ padding: '0 16px 16px', background: 'var(--white)', fontSize: fs(13), lineHeight: 1.7, color: 'var(--ink-1)', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}
            >
              {book.description}
            </p>
          )}

          <div style={{ marginTop: 12, background: 'var(--white)' }}>
            {videos.length === 0 ? (
              <p style={{ padding: '48px 16px', textAlign: 'center', fontSize: fs(14), color: 'var(--ink-2)' }}>준비 중이에요</p>
            ) : (
              videos.map((v, i) => {
                const dur = fmtReadingDuration(v.duration)
                const locked = isSecretVideo(v.isSecret)
                const pick = bulk.pickable(v)
                const cached = bulk.cachedIds.has(`${v.id}-${bulk.dlType}`)
                return (
                  <button
                    key={v.id}
                    onClick={bulk.selectMode ? () => { if (pick) bulk.toggleSelect(v.id) } : () => playReading(videos, v, { id: book.id, title: book.title })}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      paddingRight: bulk.selectMode && pick ? 48 : 16,
                      position: 'relative',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: locked ? 0.5 : 1,
                      borderBottom: i < videos.length - 1 ? '1px solid var(--divider)' : 'none',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        minWidth: 36,
                        fontSize: fs(13),
                        fontWeight: 600,
                        color: 'var(--primary-700)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.readingOrder ?? i + 1}회
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: fs(14), fontWeight: 500, lineHeight: 1.5, color: 'var(--ink-0)', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
                      {v.title}
                    </span>
                    {isLiveVideo(v.isLive) ? (
                      <span style={{ flexShrink: 0, fontSize: fs(11), fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>방송중</span>
                    ) : dur ? (
                      <span style={{ flexShrink: 0, fontSize: fs(12), color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{dur}</span>
                    ) : null}
                    {cached ? (
                      <span style={{ flexShrink: 0, fontSize: fs(11), fontWeight: 600, color: 'var(--primary-700)', whiteSpace: 'nowrap' }}>저장됨</span>
                    ) : bulk.downloadingIds.has(v.id) ? (
                      <span style={{ flexShrink: 0, fontSize: fs(11), fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>받는 중</span>
                    ) : null}
                    {bulk.selectMode && pick && <BulkSelectMark selected={bulk.selected.has(v.id)} />}
                  </button>
                )
              })
            )}
          </div>
          <BulkDownloadOverlay bulk={bulk} selectableIds={selectableIds} />
        </>
      )}
    </div>
  )
}
