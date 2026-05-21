import { useSettingsStore } from '@/store/settingsStore'
import type { Theme, AudioQuality, AutoNextDelay } from '@/store/settingsStore'

const QUALITY_OPTIONS: { value: AudioQuality; label: string; desc: string }[] = [
  { value: 'high', label: '고음질', desc: '최대 비트레이트' },
  { value: 'medium', label: '보통', desc: '균형 잡힌 품질' },
  { value: 'low', label: '저음질', desc: '데이터 절약' },
]

const AUTO_NEXT_OPTIONS: { value: AutoNextDelay; label: string; desc: string }[] = [
  { value: 'immediate', label: '바로 재생', desc: '곡이 끝나면 즉시 다음 곡' },
  { value: '3s', label: '3초 후 재생', desc: '잠시 후 다음 곡으로 이동' },
  { value: '5s', label: '5초 후 재생', desc: '여유 있게 다음 곡으로 이동' },
  { value: 'off', label: '자동 재생 안함', desc: '다음 곡으로 이동하지 않음' },
]

export default function MyPage() {
  const { theme, quality, autoPlayOnDetail, autoNextDelay, setTheme, setQuality, setAutoPlayOnDetail, setAutoNextDelay } = useSettingsStore()

  return (
    <div className="animate-fade-in">
      <header
        className="sticky top-0 z-10 flex items-center px-4"
        style={{ height: 56, background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <h1 className="text-base font-medium" style={{ color: 'var(--ink-0)' }}>설정</h1>
      </header>

      <div className="p-5 space-y-5">
        {/* Theme */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>테마</p>
          <div className="card overflow-hidden">
            {(['light', 'dark'] as Theme[]).map((t, i) => {
              const active = theme === t
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: i === 0 ? '1px solid var(--divider)' : 'none',
                    background: active ? 'var(--primary-50)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 18 }}>{t === 'light' ? '☀️' : '🌙'}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>
                      {t === 'light' ? '라이트' : '다크'}
                    </span>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Audio quality */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>음질</p>
          <div className="card overflow-hidden">
            {QUALITY_OPTIONS.map((opt, i) => {
              const active = quality === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: i < QUALITY_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                    background: active ? 'var(--primary-50)' : 'transparent',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>{opt.label}</p>
                    <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>{opt.desc}</p>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Playback */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>재생</p>
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setAutoPlayOnDetail(!autoPlayOnDetail)}
              className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
              style={{ background: autoPlayOnDetail ? 'var(--primary-50)' : 'transparent' }}
            >
              <div>
                <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>상세페이지 자동 재생</p>
                <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>
                  홈에서 영상을 열 때 바로 재생합니다.
                </p>
              </div>
              <span
                className="relative inline-flex flex-shrink-0 transition-colors"
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 999,
                  background: autoPlayOnDetail ? 'var(--primary-700)' : 'var(--surface-3)',
                }}
                aria-hidden="true"
              >
                <span
                  className="absolute transition-transform"
                  style={{
                    width: 20,
                    height: 20,
                    top: 2,
                    left: 2,
                    borderRadius: '50%',
                    background: 'var(--white)',
                    transform: autoPlayOnDetail ? 'translateX(18px)' : 'translateX(0)',
                  }}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Auto next */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-3)' }}>다음곡 자동재생</p>
          <div className="card overflow-hidden">
            {AUTO_NEXT_OPTIONS.map((opt, i) => {
              const active = autoNextDelay === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setAutoNextDelay(opt.value)}
                  className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                  style={{
                    borderBottom: i < AUTO_NEXT_OPTIONS.length - 1 ? '1px solid var(--divider)' : 'none',
                    background: active ? 'var(--primary-50)' : 'transparent',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-left" style={{ color: 'var(--ink-0)' }}>{opt.label}</p>
                    <p className="text-xs text-left mt-0.5" style={{ color: 'var(--ink-2)' }}>{opt.desc}</p>
                  </div>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ color: 'var(--primary-700)' }}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* App info */}
        <div className="card divide-y" style={{ borderColor: 'var(--divider)' }}>
          {[
            { label: '제작', value: '주님의 교회' },
            { label: '앱 버전', value: 'Selah v1.0' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ink-0)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
