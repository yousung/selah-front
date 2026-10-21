import { useNavigate } from 'react-router-dom'
import { fs } from '@/lib/fontScale'
import { useFestivals } from '@/lib/hymnPlaylists'

interface NewsItem {
  key: string
  label: string
  sub: string
  /** 없으면 준비 중 항목 — 비활성 + "준비 중" 배지 */
  to?: string
  icon: React.ReactNode
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function iconSvg(children: React.ReactNode) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

/** 우리들 소식 — 시편 찬송 모임 바로가기(영상 본체는 찬송 탭 /festival/:year) + 준비 중 항목(광고, 생일) */
export default function NewsPage() {
  const navigate = useNavigate()
  const { data: festivals } = useFestivals()
  const latest = festivals?.find((f) => f.videoCount > 0)

  const items: NewsItem[] = [
    ...(latest
      ? [{
          key: 'festival',
          label: `${latest.year} 시편 찬송 모임`,
          sub: `팀별 찬양 ${latest.videoCount}편이 올라왔어요`,
          to: `/festival/${latest.year}`,
          icon: iconSvg(
            <>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </>,
          ),
        }]
      : []),
    {
      key: 'ads',
      label: '광고',
      sub: '교회 광고와 행사 안내',
      icon: iconSvg(
        <>
          <path d="M3 11l18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </>,
      ),
    },
    {
      key: 'birthday',
      label: '생일',
      sub: '이달의 생일을 함께 축하해요',
      icon: iconSvg(
        <>
          <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
          <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
          <path d="M2 21h20" />
          <path d="M7 8v3M12 8v3M17 8v3" />
          <path d="M7 4h.01M12 4h.01M17 4h.01" />
        </>,
      ),
    },
  ]

  return (
    <div style={{ background: 'var(--surface-0)' }}>
      <header
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>우리들 소식</h1>
        </div>
      </header>

      <div style={{ padding: '12px 0' }}>
        <div style={{ background: 'var(--white)' }}>
          {items.map((item, i) => {
            const ready = !!item.to
            return (
              <button
                key={item.key}
                disabled={!ready}
                aria-disabled={!ready}
                onClick={() => item.to && navigate(item.to)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: ready ? 'pointer' : 'default',
                  borderBottom: i < items.length - 1 ? '1px solid var(--divider)' : 'none',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--primary-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    opacity: ready ? 1 : 0.5,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, wordBreak: 'keep-all' }}>
                  <p style={{ fontSize: fs(15), fontWeight: 600, color: ready ? 'var(--ink-0)' : 'var(--ink-3)' }}>{item.label}</p>
                  <p style={{ fontSize: fs(12), color: 'var(--ink-3)', marginTop: 1 }}>{item.sub}</p>
                </div>
                {ready ? (
                  <ChevronRight />
                ) : (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: fs(11),
                      fontWeight: 600,
                      color: 'var(--ink-3)',
                      background: 'var(--surface-2)',
                      borderRadius: 999,
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    준비 중
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
