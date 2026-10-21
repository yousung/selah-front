import { fs } from '@/lib/fontScale'

export default function NewsPage() {
  return (
    <div style={{ background: 'var(--surface-0)' }}>
      <header
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ padding: '0 16px', minHeight: 56, display: 'flex', alignItems: 'center' }}>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>우리들 소식</h1>
        </div>
      </header>

      <div style={{ padding: '64px 16px', textAlign: 'center', wordBreak: 'keep-all' }}>
        <p style={{ fontSize: fs(15), fontWeight: 600, color: 'var(--ink-1)' }}>준비 중입니다</p>
        <p style={{ fontSize: fs(13), color: 'var(--ink-3)', marginTop: 6 }}>교회 소식을 곧 이곳에서 전해 드릴게요.</p>
      </div>
    </div>
  )
}
