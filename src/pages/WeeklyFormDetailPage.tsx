import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { getWeeklyForm } from '@/lib/api'
import { fs } from '@/lib/fontScale'
import { formatWeeklyFormRange } from '@/lib/weeklyForm'
import { ItemList } from '@/pages/MemorizePage'

export default function WeeklyFormDetailPage() {
  const navigate = useNavigate()
  const { startDate = '' } = useParams<{ startDate: string }>()
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['memory-verses', 'week', startDate],
    queryFn: () => getWeeklyForm(startDate),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(startDate),
  })

  const title = items?.length
    ? formatWeeklyFormRange(items[0].startDate, items[0].endDate)
    : '이전 양식 상세'

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ padding: '0 8px', minHeight: 56, display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => navigate('/memorize/archive')}
            aria-label="이전 양식 목록으로 돌아가기"
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
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>양식 상세를 불러오지 못했습니다.</div>
        )}

        {!isLoading && !error && items && items.length > 0 && (
          <section style={{ borderRadius: 18, padding: '22px 20px 24px', background: 'var(--white)', border: '1px solid var(--divider)' }}>
            <h2 style={{ margin: `0 0 ${fs(20)} 0`, paddingBottom: fs(16), borderBottom: '1px solid var(--divider)', fontFamily: 'var(--font-serif)', fontSize: fs(17), fontWeight: 800, lineHeight: 1.5, color: 'var(--primary-700)', wordBreak: 'keep-all' }}>
              {title}
            </h2>
            <ItemList items={items} hero={false} />
          </section>
        )}
      </main>
    </div>
  )
}
