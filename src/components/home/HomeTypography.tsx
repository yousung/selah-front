import type { ReactNode } from 'react'
import { fs } from '@/lib/fontScale'

/** 홈 섹션 라벨 — 작고 조용한 자간 라벨 (장식 없음) */
export function HomeLabel({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: fs(11),
        fontWeight: 600,
        letterSpacing: '0.08em',
        lineHeight: 1.5,
        color: 'var(--ink-1)',
      }}
    >
      {children}
    </h2>
  )
}

/** 블록 끝의 조용한 텍스트 링크 ("… →"). 박스 없이 44px 터치 영역만 확보 */
export function HomeMoreLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary-700)]"
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: fs(12),
        fontWeight: 600,
        color: 'var(--primary-700)',
        textAlign: 'left',
      }}
    >
      {children}
      <span aria-hidden="true">→</span>
    </button>
  )
}
