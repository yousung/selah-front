import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getPreviousWeeklyForms } from '@/lib/api'
import { fs } from '@/lib/fontScale'
import { formatWeeklyFormRange } from '@/lib/weeklyForm'

export default function WeeklyFormArchivePage() {
  const navigate = useNavigate()
  const { data: weeks, isLoading, error } = useQuery({
    queryKey: ['memory-verses', 'previous'],
    queryFn: getPreviousWeeklyForms,
  })

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ padding: '0 8px', minHeight: 56, display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => navigate('/memorize')}
            aria-label="한 주간의 양식으로 돌아가기"
            style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', border: 'none', borderRadius: 999, background: 'transparent', color: 'var(--ink-0)', cursor: 'pointer' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>이전 양식</h1>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '20px 16px 32px' }}>
        {isLoading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>불러오는 중…</div>
        )}

        {error && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>이전 양식을 불러오지 못했습니다.</div>
        )}

        {!isLoading && !error && weeks?.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>등록된 이전 양식이 없습니다.</div>
        )}

        {!isLoading && !error && weeks && weeks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {weeks.map((week) => (
              <button
                key={`${week.startDate}:${week.endDate}`}
                type="button"
                onClick={() => navigate(`/memorize/archive/${week.startDate}`)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '18px 16px',
                  border: '1px solid var(--divider)',
                  borderRadius: 14,
                  background: 'var(--white)',
                  color: 'var(--ink-0)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: fs(15), fontWeight: 700, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                  {formatWeeklyFormRange(week.startDate, week.endDate)}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
