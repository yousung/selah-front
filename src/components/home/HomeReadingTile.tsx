import { useNavigate } from 'react-router-dom'
import { fs } from '@/lib/fontScale'
import { isPlayableInQueue } from '@/lib/liveVideo'
import { fmtReadingDuration, readingCover, usePlayReading, useReadingCategory, useReadingLatest } from '@/lib/reading'
import { clamp } from '@/components/home/homeBento'
import { HomeLabel, HomeMoreLink } from '@/components/home/HomeTypography'

const SERIF = 'var(--font-serif)'

/** 홈 "오늘의 독서" — 최근 7일 안 가장 새 회차 1편을 대표 카드로. 없음/오류(백엔드 미배포 포함)면 null */
export default function HomeReadingTile() {
  const navigate = useNavigate()
  const playReading = usePlayReading()
  const { data } = useReadingLatest()
  const latest = (data ?? []).find(isPlayableInQueue)
  // 책 상세는 표지·큐 구성에 필요 — 책 화면과 같은 queryKey라 캐시 공유
  const { data: book } = useReadingCategory(latest?.readingCategory.id)
  if (!latest) return null

  const cat = latest.readingCategory
  const cover = readingCover(book?.thumbnail, latest.thumbnail)
  const dur = fmtReadingDuration(latest.duration)
  const meta = [latest.readingOrder != null ? `${latest.readingOrder}회` : null, dur].filter(Boolean).join(' · ')

  const play = () => {
    const queue = book?.videos?.length ? book.videos : [latest]
    playReading(queue, latest, cat)
  }

  return (
    <section aria-label="오늘의 독서" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 16, marginBottom: 8 }}>
        <HomeLabel>오늘의 독서</HomeLabel>
        <HomeMoreLink onClick={() => navigate(`/reading/${cat.id}`)}>도서 목록 보기</HomeMoreLink>
      </div>
      <div className="hb" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
        <div style={{ flexShrink: 0, width: 'clamp(72px, 22%, 112px)', aspectRatio: '5 / 7', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
          {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ ...clamp(2), fontSize: fs(11), fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1.5, color: 'var(--ink-1)' }}>{cat.title}</span>
          <span style={{ ...clamp(3), marginTop: fs(6), fontFamily: SERIF, fontSize: fs(16), fontWeight: 600, lineHeight: 1.45, color: 'var(--ink-0)' }}>{latest.title}</span>
          {meta && <span style={{ marginTop: fs(4), fontSize: fs(12), color: 'var(--ink-2)' }}>{meta}</span>}
          <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 16 }}>
            <button
              type="button"
              onClick={play}
              aria-label={`독서 재생: ${latest.title}`}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary-700)]"
              // "이번 주 설교"의 "말씀 듣기 →"와 같은 텍스트 링크 모양
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: fs(12), fontWeight: 600, color: 'var(--primary-700)', whiteSpace: 'nowrap' }}
            >
              듣기 <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
