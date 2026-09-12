import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PrayerContent } from '@/components/PrayerContent'
import { getCurrentMemoryVerses, getPreviousWeeklyForms, MemoryVerse, WeeklyItemType, PrayerCategory } from '@/lib/api'
import { fs } from '@/lib/fontScale'

const SERIF = 'var(--font-serif)'

interface Week {
  period: string
  startDate: string
  endDate: string
  items: MemoryVerse[]
}

const TYPE_LABEL: Record<WeeklyItemType, string> = {
  bible_reading: '말씀 묵상',
  shorter_catechism: '소요리문답 암송',
  memory_verse: '말씀 암송',
  reading: '독서',
  larger_catechism: '대요리문답',
}

/** 유형 라벨 — 본문과 같은 좌측선에 플러시 정렬(배경 없음) */
function TypeLabel({ type, hero }: { type: WeeklyItemType; hero: boolean }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: fs(hero ? 17 : 13),
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: 'var(--primary-700)',
      }}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}

/** 항목 1개 — 유형별 본문 */
function ItemBody({ item, hero }: { item: MemoryVerse; hero: boolean }) {
  const navigate = useNavigate()
  const sub = 'var(--ink-3)'

  // 내부 경로('/...')는 SPA 네비게이션, 외부 URL은 새 탭
  const openLink = (link: string) => {
    if (link.startsWith('/')) navigate(link)
    else window.open(link, '_blank', 'noopener,noreferrer')
  }

  switch (item.type) {
    case 'memory_verse':
      return (
        <div>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: fs(hero ? 15 : 14),
              lineHeight: fs(hero ? 26 : 24),
              color: hero ? 'var(--ink-0)' : 'var(--ink-1)',
              whiteSpace: 'pre-line',
              wordBreak: 'keep-all',
              margin: 0,
            }}
          >
            {item.content}
          </p>
          {item.reference && (
            <div
              style={{
                marginTop: fs(8),
                textAlign: 'right',
                fontFamily: SERIF,
                fontSize: fs(hero ? 13 : 11),
                fontWeight: 600,
                color: 'var(--primary-700)',
                opacity: 0.82,
                letterSpacing: '-0.01em',
              }}
            >
              {item.reference}
            </div>
          )}
        </div>
      )

    case 'bible_reading':
      return (
        <p
          style={{
            fontFamily: SERIF,
            fontSize: fs(hero ? 19 : 16),
            fontWeight: 600,
            color: 'var(--ink-0)',
            wordBreak: 'keep-all',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {item.content}
        </p>
      )

    case 'shorter_catechism':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: fs(8), flexWrap: 'wrap' }}>
            {item.reference && (
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: fs(hero ? 17 : 14),
                  fontWeight: 700,
                  color: 'var(--primary-700)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.reference}
              </span>
            )}
            {item.title && (
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: fs(hero ? 17 : 14),
                  fontWeight: 700,
                  color: 'var(--ink-0)',
                  wordBreak: 'keep-all',
                }}
              >
                {item.title}
              </span>
            )}
          </div>
          {item.content && (
            <p
              style={{
                marginTop: fs(6),
                fontSize: fs(hero ? 15 : 13),
                lineHeight: fs(hero ? 26 : 22),
                color: 'var(--ink-1)',
                whiteSpace: 'pre-line',
                wordBreak: 'keep-all',
                marginBottom: 0,
              }}
            >
              {item.content}
            </p>
          )}
        </div>
      )

    case 'reading':
      return (
        <div style={{ display: 'flex', gap: fs(16), alignItems: 'center', justifyContent: 'center' }}>
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              style={{
                width: fs(hero ? 128 : 80),
                maxWidth: '32vw',
                height: 'auto',
                borderRadius: 6,
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                flexShrink: 0,
                display: 'block',
              }}
            />
          )}
          <div style={{ minWidth: 0, textAlign: 'center' }}>
            <p
              style={{
                fontFamily: SERIF,
                fontSize: fs(hero ? 18 : 15),
                fontWeight: 700,
                color: 'var(--ink-0)',
                wordBreak: 'keep-all',
                margin: 0,
              }}
            >
              {item.title ?? '신앙 서적 읽기'}
            </p>
            {item.content && (
              <div style={{ marginTop: fs(5), fontSize: fs(hero ? 13 : 12), color: 'var(--ink-1)' }}>
                {item.content}
              </div>
            )}
            {item.title && (
              <div style={{ marginTop: fs(6), fontSize: fs(hero ? 12 : 11), color: sub }}>
                신앙 서적 읽기
              </div>
            )}
          </div>
        </div>
      )

    case 'larger_catechism':
      return (
        <div>
          <p
            style={{
              fontSize: fs(hero ? 16 : 14),
              fontWeight: 400,
              color: 'var(--ink-0)',
              lineHeight: fs(hero ? 24 : 21),
              wordBreak: 'keep-all',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {item.title ?? '대요리문답 영상'}
          </p>
          {item.link && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: fs(14) }}>
              <button
                type="button"
                onClick={() => openLink(item.link as string)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: fs(7),
                  fontSize: fs(hero ? 13 : 12),
                  fontWeight: 700,
                  color: 'var(--white)',
                  background: 'var(--primary-700)',
                  border: 'none',
                  borderRadius: 999,
                  padding: `${fs(9)} ${fs(18)}`,
                  boxShadow: '0 3px 10px rgba(61,107,68,0.30)',
                  cursor: 'pointer',
                }}
              >
                <svg width={fs(13)} height={fs(13)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                영상 보기
              </button>
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}

/** 항목 리스트 (구분선 + 여백) */
export function ItemList({ items, hero }: { items: MemoryVerse[]; hero: boolean }) {
  return (
    <div className={hero ? 'weekly-items' : undefined} style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <div
          key={it.id}
          className={hero ? 'weekly-item' : undefined}
          style={{
            paddingTop: !hero && i > 0 ? fs(16) : undefined,
            marginTop: !hero && i > 0 ? fs(16) : undefined,
            borderTop: i > 0 ? '1px solid var(--divider)' : 'none',
          }}
        >
          <div className={hero ? `weekly-item-layout${it.type === 'shorter_catechism' ? ' weekly-item-layout--catechism' : ''}` : undefined}>
            <div className={hero ? 'weekly-label' : undefined} style={{ marginBottom: hero ? 0 : fs(8) }}>
              <TypeLabel type={it.type} hero={hero} />
            </div>
            <div className={hero ? 'weekly-body' : undefined}><ItemBody item={it} hero={hero} /></div>
          </div>
        </div>
      ))}
    </div>
  )
}


export default function MemorizePage({ category }: { category?: PrayerCategory }) {
  const navigate = useNavigate()
  const activeTab = category ? 'prayer' : 'weekly-form'
  const [prayerHeaderTarget, setPrayerHeaderTarget] = useState<HTMLDivElement | null>(null)
  const previousWeeks = useQuery({
    queryKey: ['memory-verses', 'previous'],
    queryFn: getPreviousWeeklyForms,
    enabled: activeTab === 'weekly-form',
  })
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['memory-verses', 'current'],
    queryFn: getCurrentMemoryVerses,
  })

  const current: Week | null = items && items.length > 0
    ? {
        period: items[0].period,
        startDate: items[0].startDate,
        endDate: items[0].endDate,
        items: [...items].sort((a, b) => a.itemOrder - b.itemOrder),
      }
    : null

  return (
    <div className="weekly-page" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>한 주간의 양식</h1>
          {activeTab === 'weekly-form' && previousWeeks.isSuccess && previousWeeks.data.length > 0 && (
            <button type="button" className="content-archive-link" onClick={() => navigate('/memorize/archive')}>
              이전 양식 <span aria-hidden="true">→</span>
            </button>
          )}
          {activeTab === 'prayer' && <div ref={setPrayerHeaderTarget} style={{ flexShrink: 0 }} />}
        </div>
        <div role="tablist" aria-label="양식 콘텐츠" style={{ display: 'flex', padding: '0 16px', gap: fs(24) }}>
          {([
            ['weekly-form', '이번 주 양식'],
            ['prayer', '기도'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              id={`memorize-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`memorize-panel-${tab}`}
              onClick={() => { if (activeTab !== tab) navigate(tab === 'prayer' ? '/memorize/prayer/daily' : '/memorize/weekly') }}
              style={{
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary-700)' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab ? 'var(--primary-700)' : 'var(--ink-2)',
                padding: `${fs(12)} 0 ${fs(10)}`,
                fontSize: fs(14),
                fontWeight: activeTab === tab ? 800 : 600,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 820, width: '100%', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ width: '100%', paddingTop: 24, paddingBottom: 24 }}>
        {activeTab === 'weekly-form' && isLoading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            불러오는 중…
          </div>
        )}

        {activeTab === 'weekly-form' && error && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            양식을 불러오지 못했습니다.
          </div>
        )}

        {activeTab === 'weekly-form' && !isLoading && !error && (
          <div id="memorize-panel-weekly-form" role="tabpanel" aria-labelledby="memorize-tab-weekly-form">
            <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--divider)' }}>
              <p style={{ fontSize: fs(14), lineHeight: 1.6, color: 'var(--ink-1)', margin: 0 }}>
                {current ? `${current.startDate.slice(0, 4)}년 · ${current.period}` : '이번 주에 함께 읽고 묵상할 내용을 확인해 보세요.'}
              </p>
            </div>

            <section className="weekly-content">
              {current ? (
                <ItemList items={current.items} hero />
              ) : (
                <p style={{ padding: `${fs(28)} ${fs(20)}`, fontFamily: SERIF, fontSize: fs(16), color: 'var(--ink-1)', lineHeight: fs(26), margin: 0 }}>
                  이번 주 양식이 아직 등록되지 않았습니다.
                </p>
              )}
            </section>

          </div>
        )}

        {category && <PrayerContent key={category} category={category} headerTarget={prayerHeaderTarget} />}
        </div>
      </div>
    </div>
  )
}
