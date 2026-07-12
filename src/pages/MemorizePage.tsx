import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentMemoryVerses, MemoryVerse, WeeklyItemType } from '@/lib/api'
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <div
          key={it.id}
          style={{
            paddingTop: i > 0 ? fs(hero ? 20 : 16) : 0,
            marginTop: i > 0 ? fs(hero ? 20 : 16) : 0,
            borderTop: i > 0 ? '1px solid var(--divider)' : 'none',
          }}
        >
          <div style={{ marginBottom: fs(hero ? 10 : 8) }}>
            <TypeLabel type={it.type} hero={hero} />
          </div>
          <ItemBody item={it} hero={hero} />
        </div>
      ))}
    </div>
  )
}

export default function MemorizePage() {
  const navigate = useNavigate()
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
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, zIndex: 10, paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>한 주간의 양식</h1>
          <button
            type="button"
            onClick={() => navigate('/memorize/archive')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--divider)',
              borderRadius: 999,
              background: 'var(--white)',
              color: 'var(--primary-700)',
              padding: '7px 12px',
              fontSize: fs(13),
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
            이전 양식
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '0 16px', minHeight: 'calc(100dvh - 56px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '100%', margin: 'auto 0', paddingTop: 20, paddingBottom: 8 }}>
        {isLoading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            불러오는 중…
          </div>
        )}

        {error && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            양식을 불러오지 못했습니다.
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ── 이번 주 양식 (Hero) ── */}
            <section
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 18,
                padding: '24px 22px 26px',
                background: 'linear-gradient(155deg, var(--primary-50) 0%, var(--surface-0) 78%)',
                border: '1px solid var(--divider)',
              }}
            >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: fs(18), flexWrap: 'wrap' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--primary-500)' }} />
                <span style={{ fontSize: fs(21), fontWeight: 800, letterSpacing: '0.04em', color: 'var(--primary-700)' }}>
                  이번 주 양식
                </span>
                {current && (
                  <span style={{ marginLeft: 'auto', textAlign: 'right', fontSize: fs(21), color: 'var(--ink-3)' }}>
                    {current.startDate.slice(0, 4)} · {current.period}
                  </span>
                )}
              </div>

              {current ? (
                <ItemList items={current.items} hero />
              ) : (
                <p style={{ fontFamily: SERIF, fontSize: fs(16), color: 'var(--ink-1)', lineHeight: fs(26), margin: `${fs(6)} 0 0` }}>
                  이번 주 양식이 아직 등록되지 않았습니다.
                </p>
              )}
            </section>

          </>
        )}
        </div>
      </div>
    </div>
  )
}
