import type { FestivalSummary } from '@/lib/api'

/** 시편 찬송 모임 연도 칩 — HymnPage 섹션과 FestivalPage 헤더가 공유 */
export default function FestivalYearChips({ festivals, year, onChange }: {
  festivals: FestivalSummary[]
  year: number
  onChange: (year: number) => void
}) {
  if (festivals.length < 2) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {festivals.map((f) => {
        const isActive = f.year === year
        return (
          <button
            key={f.year}
            onClick={() => onChange(f.year)}
            aria-pressed={isActive}
            className="text-xs font-medium transition-colors duration-150"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: `1px solid ${isActive ? 'var(--primary-700)' : 'var(--divider)'}`,
              color: isActive ? 'var(--white)' : 'var(--ink-2)',
              background: isActive ? 'var(--primary-700)' : 'var(--surface-1)',
            }}
          >
            {f.year}
          </button>
        )
      })}
    </div>
  )
}
