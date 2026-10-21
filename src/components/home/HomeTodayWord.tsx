import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentMemoryVerses } from '@/lib/api'
import { fs } from '@/lib/fontScale'
import { HomeLabel, HomeMoreLink } from '@/components/home/HomeTypography'

const SERIF = 'var(--font-serif)'

// 구절 본문은 HomeNowPrayer 기도 본문 p 스타일(라벨 아래 간격은 기도 제목과 동일), 그 아래 출처(reference)는 더 작은 글씨로 우측 정렬.
// 본문·출처를 maxWidth 34em 래퍼로 묶어 출처가 본문 오른쪽 끝에 맞춰지게 함.
// 단 기도 본문(.hp-body)과 달리 줄 수 클램프 없음 — 성경 본문은 자르지 않는다.

/** 홈 "오늘의 암송" — 이번 주 암송 구절을 조용한 면(.hb) 블록으로. 캐시는 MemorizePage와 공유 */
export default function HomeTodayWord() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['memory-verses', 'current'],
    queryFn: getCurrentMemoryVerses,
  })

  const verse = data
    ?.filter((it) => it.type === 'memory_verse' && it.content)
    .sort((a, b) => a.itemOrder - b.itemOrder)[0]

  if (!verse) {
    if (!isLoading) return null
    return (
      <div className="hb" aria-hidden="true">
        <div style={{ width: 64, height: 10, borderRadius: 4, background: 'var(--surface-2)' }} />
        <div style={{ marginTop: 24, width: '92%', height: 20, borderRadius: 4, background: 'var(--surface-2)' }} />
        <div style={{ marginTop: 12, width: '70%', height: 20, borderRadius: 4, background: 'var(--surface-2)' }} />
      </div>
    )
  }

  return (
    <section aria-label="오늘의 암송" className="hb" style={{ overflowWrap: 'anywhere', wordBreak: 'keep-all' }}>
      <HomeLabel>오늘의 암송</HomeLabel>
      <div style={{ maxWidth: '34em', fontSize: fs(14) }}>
        <p
          style={{
            margin: `${fs(16)} 0 0`,
            fontFamily: SERIF,
            fontSize: fs(14),
            lineHeight: 1.7,
            color: 'var(--ink-1)',
            whiteSpace: 'pre-line',
          }}
        >
          {verse.content}
        </p>
        {verse.reference && (
          <p
            style={{
              margin: `${fs(8)} 0 0`,
              textAlign: 'right',
              fontFamily: SERIF,
              fontSize: fs(12),
              lineHeight: 1.5,
              color: 'var(--ink-2)',
            }}
          >
            {verse.reference}
          </p>
        )}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <HomeMoreLink onClick={() => navigate('/memorize/weekly')}>암송하기</HomeMoreLink>
      </div>
    </section>
  )
}
