import { useState } from 'react'
import { createPortal } from 'react-dom'
import { DailyPrayerBody, PrayerSection } from './DailyPrayerBody'
import { PrayerTopicsBody } from './PrayerTopicsBody'
import { useQuery } from '@tanstack/react-query'
import { getCurrentPrayers, getPreviousPrayers, Prayer, PrayerCategory } from '@/lib/api'
import { fs } from '@/lib/fontScale'

const SERIF = 'var(--font-serif)'

const PRAYER_CATEGORIES: Array<{ value: PrayerCategory; label: string; archiveLabel: string }> = [
  { value: 'daily', label: '일상기도', archiveLabel: '일상 기도' },
  { value: 'topics', label: '기도제목', archiveLabel: '기도 제목' },
  { value: 'pastoral', label: '목회기도', archiveLabel: '목회 기도' },
  { value: 'representative', label: '대표기도', archiveLabel: '대표 기도' },
]

export function PrayerContent({ headerTarget }: { headerTarget: HTMLElement | null }) {
  const [category, setCategory] = useState<PrayerCategory>('daily')
  const [showArchive, setShowArchive] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const activeCategory = PRAYER_CATEGORIES.find((item) => item.value === category)!

  const currentQuery = useQuery({
    queryKey: ['prayers', 'current', category],
    queryFn: () => getCurrentPrayers(category),
    enabled: !showArchive,
  })
  const archiveQuery = useQuery({
    queryKey: ['prayers', 'archive', category],
    queryFn: () => getPreviousPrayers(category),
  })
  const {
    data: prayers,
    isLoading,
    error,
    refetch,
    isFetching,
  } = showArchive ? archiveQuery : currentQuery

  const sortedPrayers = prayers ? [...prayers].sort((a, b) =>
    b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate) || a.itemOrder - b.itemOrder,
  ) : []
  const periods = new Map<string, Prayer[]>()
  for (const prayer of sortedPrayers) {
    const key = `${prayer.startDate}:${prayer.endDate}`
    const group = periods.get(key)
    if (group) group.push(prayer)
    else periods.set(key, [prayer])
  }
  const visiblePrayers = showArchive ? (periods.get(selectedPeriod ?? '') ?? []) : sortedPrayers

  return (
    <section id="memorize-panel-prayer" role="tabpanel" aria-labelledby="memorize-tab-prayer">
      {headerTarget && (showArchive || (archiveQuery.isSuccess && archiveQuery.data.length > 0)) && createPortal(
        <button type="button" className="content-archive-link" onClick={() => {
          setShowArchive(!showArchive)
          setSelectedPeriod(null)
        }}>
          {showArchive ? `현재 ${activeCategory.archiveLabel}` : `이전 ${activeCategory.archiveLabel}`}
          <span aria-hidden="true">{showArchive ? '←' : '→'}</span>
        </button>,
        headerTarget,
      )}
      <div
        role="tablist"
        aria-label="기도문 종류"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: 6,
          paddingTop: 3,
          paddingInline: 3,
          paddingBottom: fs(18),
          borderBottom: '1px solid var(--divider)',
        }}
      >
        {PRAYER_CATEGORIES.map((item) => {
          const selected = item.value === category
          return (
            <button
              key={item.value}
              id={`prayer-category-${item.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="prayer-category-panel"
              onClick={() => {
                setCategory(item.value)
                setShowArchive(false)
                setSelectedPeriod(null)
              }}
              style={{
                flex: '1 0 auto',
                minHeight: `max(44px, ${fs(38)})`,
                border: selected ? '1px solid var(--primary-700)' : '1px solid var(--divider)',
                borderRadius: 8,
                background: selected ? 'var(--primary-50)' : 'transparent',
                color: selected ? 'var(--primary-700)' : 'var(--ink-1)',
                padding: `${fs(8)} 4px`,
                fontSize: fs(13),
                fontWeight: selected ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div
        id="prayer-category-panel"
        role="tabpanel"
        aria-labelledby={`prayer-category-${category}`}
        style={{ paddingTop: fs(20) }}
      >
        {showArchive && selectedPeriod && (
          <button type="button" className="content-archive-link" onClick={() => setSelectedPeriod(null)}>
            <span aria-hidden="true">←</span> 이전 목록
          </button>
        )}

        {isLoading && (
          <p style={{ padding: `${fs(44)} 0`, textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14), margin: 0 }}>
            불러오는 중…
          </p>
        )}

        {error && (
          <div style={{ padding: `${fs(36)} 0`, textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-2)', fontSize: fs(14), margin: 0 }}>
              기도문을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              style={{
                marginTop: fs(14),
                minHeight: fs(40),
                border: '1px solid var(--primary-700)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--primary-700)',
                padding: `${fs(8)} ${fs(14)}`,
                fontSize: fs(13),
                fontWeight: 700,
                cursor: isFetching ? 'default' : 'pointer',
                opacity: isFetching ? 0.6 : 1,
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!isLoading && !error && sortedPrayers.length === 0 && (
          <p style={{ padding: `${fs(32)} 0`, fontFamily: SERIF, fontSize: fs(16), lineHeight: fs(26), color: 'var(--ink-1)', margin: 0 }}>
            {showArchive ? `등록된 이전 ${activeCategory.archiveLabel} 내역이 없습니다.` : '등록된 기도문이 없습니다.'}
          </p>
        )}

        {!isLoading && !error && showArchive && !selectedPeriod && (
          <div aria-label={`${activeCategory.archiveLabel} 이전 목록`}>
            {[...periods].map(([key, group]) => (
              <button key={key} type="button" onClick={() => setSelectedPeriod(key)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                width: '100%', minHeight: 56, padding: `${fs(16)} 0`,
                border: 'none', borderBottom: '1px solid var(--divider)', background: 'transparent',
                color: 'var(--ink-0)', textAlign: 'left', cursor: 'pointer',
              }}>
                <span style={{ fontSize: fs(14), lineHeight: 1.6 }}>{group[0].title}</span>
                <span style={{ fontSize: fs(12), color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                  {group.length}편 <span aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {!isLoading && !error && visiblePrayers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visiblePrayers.map((prayer, index) => category === 'representative' ? (
              <article key={`${prayer.id}:${prayer.content}`}>
                <PrayerSection title={prayer.title} body={prayer.content} headingLevel={2} />
              </article>
            ) : (
              <article
                key={prayer.id}
                style={{
                  padding: `${fs(22)} 0`,
                  borderTop: index > 0 ? '1px solid var(--divider)' : 'none',
                }}
              >
                <h2
                  style={{
                    fontFamily: SERIF,
                    fontSize: fs(24),
                    lineHeight: 1.5,
                    fontWeight: 700,
                    color: 'var(--ink-0)',
                    wordBreak: 'keep-all',
                    margin: 0,
                  }}
                >
                  {prayer.title}
                </h2>
                {category === 'daily' ? <DailyPrayerBody key={prayer.content} content={prayer.content} /> : category === 'topics' ? <PrayerTopicsBody content={prayer.content} /> : <p
                  style={{
                    margin: `${fs(12)} 0 0`,
                    fontFamily: SERIF,
                    fontSize: fs(15),
                    lineHeight: fs(28),
                    color: 'var(--ink-1)',
                    whiteSpace: 'pre-line',
                    wordBreak: 'keep-all',
                  }}
                >
                  {prayer.content}
                </p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
