export default function SermonPage() {
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
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>설교</h1>
        </div>
      </header>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 32px',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>설교</p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
          말씀의 강해와 설교 컨텐츠가<br />곧 추가됩니다.
        </p>
        <div
          style={{
            marginTop: 8,
            padding: '6px 16px',
            borderRadius: 20,
            background: 'var(--primary-50)',
            color: 'var(--primary-700)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          준비 중
        </div>
      </div>
    </div>
  )
}
