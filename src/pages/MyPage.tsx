import { useNavigate } from 'react-router-dom'

interface MenuItem {
  label: string
  sub?: string
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

export default function MyPage() {
  const navigate = useNavigate()

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: '콘텐츠',
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
      title: '설정',
      items: [
        {
          label: '앱 설정',
          sub: '테마, 글자 크기, 재생 설정',
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
  ]

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>MY</h1>
        </div>
      </header>

      <div style={{ padding: '12px 0' }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 8 }}>
            <p
              style={{
                padding: '8px 16px 6px',
                fontSize: 12,
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-0)' }}>{item.label}</p>
                    {item.sub && (
                      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{item.sub}</p>
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
