import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMemoryVerses, MemoryVerse } from '@/lib/api'
import { fs } from '@/lib/fontScale'

const SERIF = 'var(--font-serif)'

interface Week {
  period: string
  startDate: string
  endDate: string
  verses: MemoryVerse[]
}

/** 로컬 기준 오늘(YYYY-MM-DD). */
function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function VerseBody({ reference, content, refSize, bodySize, accent }: {
  reference: string
  content: string
  refSize: number
  bodySize: number
  accent?: boolean
}) {
  return (
    <div>
      <p style={{
        fontFamily: SERIF,
        fontSize: fs(bodySize),
        lineHeight: fs(Math.round(bodySize * 1.7)),
        color: accent ? 'var(--ink-0)' : 'var(--ink-1)',
        whiteSpace: 'pre-line',
        wordBreak: 'keep-all',
        margin: 0,
      }}>
        {content}
      </p>
      <div style={{ marginTop: fs(10), textAlign: 'right', fontFamily: SERIF, fontSize: fs(refSize), fontWeight: 600, color: 'var(--primary-700)', opacity: 0.82, letterSpacing: '-0.01em' }}>
        {reference}
      </div>
    </div>
  )
}

export default function MemorizePage() {
  const { data: verses, isLoading, error } = useQuery({
    queryKey: ['memory-verses'],
    queryFn: getMemoryVerses,
  })

  const weeks = useMemo<Week[]>(() => {
    const map = new Map<string, Week>()
    for (const v of verses ?? []) {
      const key = `${v.startDate}|${v.endDate}`
      let w = map.get(key)
      if (!w) {
        w = { period: v.period, startDate: v.startDate, endDate: v.endDate, verses: [] }
        map.set(key, w)
      }
      w.verses.push(v)
    }
    return [...map.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [verses])

  const today = useMemo(todayStr, [])

  // 이번 주: 오늘이 포함된 주만(없으면 null → 미등록 안내)
  const currentIdx = useMemo(
    () => weeks.findIndex((w) => w.startDate <= today && today <= w.endDate),
    [weeks, today],
  )
  const current = currentIdx >= 0 ? weeks[currentIdx] : null
  // 지난 암송: 이미 시작된 주(이번 주 제외), 최신순
  const past = useMemo(
    () => weeks.filter((w, i) => i !== currentIdx && w.startDate <= today).reverse(),
    [weeks, currentIdx, today],
  )

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>암송</h1>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 8px' }}>
        {isLoading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            불러오는 중…
          </div>
        )}

        {error && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            구절을 불러오지 못했습니다.
          </div>
        )}

        {!isLoading && !error && weeks.length > 0 && (
          <>
            {/* ── 이번 주 암송 (Hero) ── */}
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
              {/* 장식 큰 따옴표 */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 14, right: 20,
                  fontFamily: SERIF, fontSize: 96, lineHeight: 1,
                  color: 'var(--primary-700)', opacity: 0.12, pointerEvents: 'none',
                }}
              >
                ”
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: fs(14) }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--primary-500)' }} />
                <span style={{ fontSize: fs(12), fontWeight: 800, letterSpacing: '0.04em', color: 'var(--primary-700)' }}>
                  이번 주 암송
                </span>
                {current && (
                  <span style={{ fontSize: fs(12), color: 'var(--ink-3)' }}>
                    {current.startDate.slice(0, 4)} · {current.period}
                  </span>
                )}
              </div>

              {current ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: fs(28), position: 'relative' }}>
                  {current.verses.map((v, i) => (
                    <div key={v.id}>
                      {i > 0 && <div style={{ height: 1, background: 'var(--divider)', margin: `${fs(4)} 0 ${fs(28)}` }} />}
                      <VerseBody reference={v.reference} content={v.content} refSize={13} bodySize={21} accent />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: SERIF, fontSize: fs(16), color: 'var(--ink-1)', lineHeight: fs(26), margin: `${fs(6)} 0 0` }}>
                  이번 주 암송이 아직 등록되지 않았습니다.
                </p>
              )}
            </section>

            {/* ── 지난 암송 ── */}
            {past.length > 0 && (
              <section style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14, padding: '0 2px' }}>
                  <h2 style={{ fontSize: fs(16), fontWeight: 700, color: 'var(--ink-0)' }}>지난 암송</h2>
                  <span style={{ fontSize: fs(12), color: 'var(--ink-3)', fontWeight: 600 }}>{past.length}주</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {past.map((w) => (
                    <article
                      key={`${w.startDate}|${w.endDate}`}
                      style={{ background: 'var(--white)', border: '1px solid var(--divider)', borderRadius: 14, padding: '16px 16px 18px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: fs(12) }}>
                        <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--primary-500)' }} />
                        <span style={{ fontSize: fs(11), color: 'var(--ink-3)' }}>{w.startDate.slice(0, 4)}</span>
                        <span style={{ fontSize: fs(12), fontWeight: 700, color: 'var(--ink-1)' }}>{w.period}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: fs(24) }}>
                        {w.verses.map((v, i) => (
                          <div key={v.id}>
                            {i > 0 && <div style={{ height: 1, background: 'var(--divider)', margin: `${fs(4)} 0 ${fs(24)}` }} />}
                            <VerseBody reference={v.reference} content={v.content} refSize={11} bodySize={15} />
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!isLoading && !error && weeks.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: fs(14) }}>
            등록된 암송 구절이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
