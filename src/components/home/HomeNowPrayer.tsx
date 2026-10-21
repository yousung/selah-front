import { useNavigate } from 'react-router-dom'
import { useCurrentPrayer } from '@/lib/currentPrayer'
import { fs } from '@/lib/fontScale'
import { HomeLabel, HomeMoreLink } from '@/components/home/HomeTypography'

const SERIF = 'var(--font-serif)'

/** 홈 "지금의 기도" — 현재 시각에 맞는 일상기도 단락을 조용한 면(.hb) 블록으로 미리보기 (전문은 /memorize/prayer/daily) */
export default function HomeNowPrayer() {
  const navigate = useNavigate()
  const { slot, isLoading } = useCurrentPrayer()

  if (!slot) {
    if (!isLoading) return null
    return (
      <div className="hb" aria-hidden="true">
        <div style={{ width: 64, height: 10, borderRadius: 4, background: 'var(--surface-2)' }} />
        <div style={{ marginTop: 24, width: '55%', height: 18, borderRadius: 4, background: 'var(--surface-2)' }} />
        <div style={{ marginTop: 12, width: '88%', height: 14, borderRadius: 4, background: 'var(--surface-2)' }} />
      </div>
    )
  }

  return (
    <section aria-label="지금의 기도" className="hb" style={{ overflowWrap: 'anywhere', wordBreak: 'keep-all' }}>
      <HomeLabel>지금의 기도</HomeLabel>
      <h3
        style={{
          margin: `${fs(16)} 0 0`,
          fontFamily: SERIF,
          fontSize: fs(16),
          fontWeight: 600,
          lineHeight: 1.5,
          color: 'var(--ink-0)',
        }}
      >
        {slot.title}
      </h3>
      {/* 줄 수는 homeBento.ts의 .hp-body (폰 3줄, 1024+ 나란히일 때 4줄) */}
      <p
        className="hp-body"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: `${fs(8)} 0 0`,
          maxWidth: '34em',
          fontFamily: SERIF,
          fontSize: fs(14),
          lineHeight: 1.7,
          color: 'var(--ink-1)',
          whiteSpace: 'pre-line',
        }}
      >
        {slot.body}
      </p>
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <HomeMoreLink onClick={() => navigate(`/memorize/prayer/daily?open=${slot.section}`)}>기도문 이어 읽기</HomeMoreLink>
      </div>
    </section>
  )
}
