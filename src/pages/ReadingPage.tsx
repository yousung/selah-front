import { useNavigate } from 'react-router-dom'
import { fs } from '@/lib/fontScale'
import { readingCover, useReadingCategories } from '@/lib/reading'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </div>
  )
}

/** 독서 — 책 목록. 백엔드 미배포(404)·빈 응답은 모두 "준비 중"으로 보여준다 */
export default function ReadingPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useReadingCategories()
  const books = data ?? []

  return (
    <div style={{ background: 'var(--surface-0)' }}>
      <header
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>독서</h1>
        </div>
      </header>

      {isLoading ? (
        <Spinner />
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center py-20 px-6 text-center">
          <span className="text-4xl mb-4">📚</span>
          <p style={{ fontSize: fs(14), color: 'var(--ink-1)' }}>준비 중이에요</p>
          <p style={{ fontSize: fs(12), color: 'var(--ink-3)', marginTop: 4, wordBreak: 'keep-all' }}>책 요약 오디오가 곧 올라와요.</p>
        </div>
      ) : (
        <div style={{ padding: '12px 0' }}>
          <div style={{ background: 'var(--white)' }}>
            {books.map((b, i) => (
              <button
                key={b.id}
                onClick={() => navigate(`/reading/${b.id}`)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: i < books.length - 1 ? '1px solid var(--divider)' : 'none',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 56,
                    aspectRatio: '5 / 7',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {readingCover(b.thumbnail) && <img src={readingCover(b.thumbnail)!} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
                  <p style={{ fontSize: fs(15), fontWeight: 600, color: 'var(--ink-0)' }}>{b.title}</p>
                  {b.author && <p style={{ fontSize: fs(12), color: 'var(--ink-3)', marginTop: 2 }}>{b.author}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: fs(12), color: 'var(--ink-2)' }}>{b.videoCount}편</span>
                    {b.isCompleted && (
                      <span
                        style={{
                          fontSize: fs(11),
                          fontWeight: 600,
                          color: 'var(--primary-700)',
                          background: 'var(--primary-50)',
                          borderRadius: 999,
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        완료
                      </span>
                    )}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
