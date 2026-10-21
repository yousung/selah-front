import { useNavigate } from 'react-router-dom'
import { fs } from '@/lib/fontScale'

interface MenuItem {
  label: string
  sub?: string
  /** sub가 성경 구절일 때 출처(개역개정) */
  ref?: string
  to: string
  icon: React.ReactNode
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export default function MenuPage() {
  const navigate = useNavigate()

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: '바로가기',
      items: [
        {
          label: '찬송',
          sub: '새 노래로 여호와께 노래하라',
          ref: '시편 96:1',
          to: '/hymn',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          ),
        },
        {
          label: '설교',
          sub: '믿음은 들음에서 나며 들음은 그리스도의 말씀으로 말미암았느니라',
          ref: '로마서 10:17',
          to: '/sermon',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
              <line x1="12" y1="18" x2="12" y2="22" />
            </svg>
          ),
        },
        {
          label: '양식',
          sub: '…네 손목에 매어 기호를 삼으며 네 미간에 붙여 표로 삼고',
          ref: '신명기 6:8',
          to: '/memorize',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
              <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </svg>
          ),
        },
        {
          label: '교리서',
          sub: '…내게 들은 바 바른 말을 본받아 지키고',
          ref: '디모데후서 1:13',
          to: '/catechism',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ),
        },
        {
          label: '우리들 소식',
          sub: '보라 형제가 연합하여 동거함이 어찌 그리 선하고 아름다운고',
          ref: '시편 133:1',
          to: '/news',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          ),
        },
        {
          label: '설정',
          sub: '모든 것을 품위 있게 하고 질서 있게 하라',
          ref: '고린도전서 14:40',
          to: '/settings',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: '내 콘텐츠',
      items: [
        {
          label: '내 재생목록',
          sub: '저장한 재생목록 모아보기',
          to: '/my-playlists',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          ),
        },
        {
          label: '최근 재생',
          sub: '최근에 들은 찬송',
          to: '/recent',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
        },
      ],
    },
    {
      title: '정보',
      items: [
        {
          label: '개인정보 처리방침',
          sub: '개인정보 처리 기준과 문의 방법',
          to: '/privacy',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-700)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-5" />
            </svg>
          ),
        },
      ],
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
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>메뉴</h1>
        </div>
      </header>

      <div style={{ padding: '12px 0' }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 8 }}>
            <p
              style={{
                padding: '8px 16px 6px',
                fontSize: fs(12),
                fontWeight: 600,
                color: 'var(--ink-3)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {section.title}
            </p>
            <div style={{ background: 'var(--white)' }}>
              {section.items.map((item, i) => (
                <button
                  key={item.to}
                  data-tour={item.to === '/settings' ? 'settings-link' : undefined}
                  onClick={() => navigate(item.to)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderBottom: i < section.items.length - 1 ? '1px solid var(--divider)' : 'none',
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
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, wordBreak: 'keep-all' }}>
                    <p style={{ fontSize: fs(15), fontWeight: 600, color: 'var(--ink-0)' }}>{item.label}</p>
                    {item.sub && (
                      <p style={{ fontSize: fs(12), color: 'var(--ink-3)', marginTop: 1 }}>{item.sub}</p>
                    )}
                    {item.ref && (
                      <p style={{ fontSize: fs(11), color: 'var(--ink-3)', opacity: 0.8, marginTop: 1 }}>{item.ref}</p>
                    )}
                  </div>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
