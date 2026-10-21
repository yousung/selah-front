import { useSettingsStore } from '@/store/settingsStore'
import { fs } from '@/lib/fontScale'
import HomeTodayWord from '@/components/home/HomeTodayWord'
import HomeNowPrayer from '@/components/home/HomeNowPrayer'
import HomeSermonTiles from '@/components/home/HomeSermonTiles'
import HomeHymnTile from '@/components/home/HomeHymnTile'
import { HOME_CSS } from '@/components/home/homeBento'

// 홈: 머리말 → 읽는 영역(오늘의 암송 · 지금의 기도, 같은 조용한 면 블록 둘) → 듣는 영역(이번 주 설교 타일 · 찬송 타일).
// 데이터 없는 섹션은 각 컴포넌트가 null을 반환해 flex gap만 남기고 사라진다
export default function HomePage() {
  const fontScale = useSettingsStore((s) => s.fontScale)
  const today = new Date()
  const date = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  const dateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-5 pb-10 sm:px-8" style={{ background: 'var(--surface-0)', overflowWrap: 'anywhere' }}>
      <style>{HOME_CSS}</style>
      <header style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ padding: '32px 0 24px' }}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1" style={{ fontSize: fs(11), color: 'var(--ink-1)' }}>
            <span style={{ fontWeight: 600, letterSpacing: '0.24em', color: 'var(--ink-0)' }}>SELAH</span>
            <time dateTime={dateISO}>{date}</time>
          </div>
          <h1 className="font-medium" style={{ marginTop: 10, fontSize: fs(22), lineHeight: 1.5, fontFamily: 'var(--font-serif)', color: 'var(--ink-0)', wordBreak: 'keep-all' }}>오늘도, 말씀 안에 머물러요</h1>
        </div>
      </header>

      <div className="home" data-fs={String(fontScale)}>
        <div className="home-read">
          <HomeTodayWord />
          <HomeNowPrayer />
        </div>
        <HomeSermonTiles />
        <HomeHymnTile />
      </div>
    </div>
  )
}
