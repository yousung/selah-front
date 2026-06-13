import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getConfessions, ConfessionListItem } from '@/lib/api'

interface ConfessionGroup {
  groupCode: string
  groupTitle: string
  groupOrdering: number
  items: ConfessionListItem[]
}

function groupConfessions(confessions: ConfessionListItem[]): ConfessionGroup[] {
  const groupMap = new Map<string, ConfessionGroup>()
  const groupOrder: string[] = []

  for (const confession of confessions) {
    if (!groupMap.has(confession.groupCode)) {
      groupMap.set(confession.groupCode, {
        groupCode: confession.groupCode,
        groupTitle: confession.groupTitle,
        groupOrdering: confession.groupOrdering,
        items: [],
      })
      groupOrder.push(confession.groupCode)
    }
    groupMap.get(confession.groupCode)!.items.push(confession)
  }

  return groupOrder.map(code => groupMap.get(code)!)
}

function ConfessionCard({ confession, onClick }: { confession: ConfessionListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{
        background: 'var(--white)',
        border: '1px solid var(--divider)',
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary-500)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(62, 107, 68, 0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--divider)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-0)', marginBottom: 8 }}>
        {confession.title}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: 'var(--ink-2)',
          lineHeight: 1.6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          marginBottom: 12,
          whiteSpace: 'normal',
          wordBreak: 'keep-all',
          minHeight: '3.2em',
        }}
      >
        {confession.description || '설명이 없습니다'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {confession.sectionCount > 0 && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 14,
              background: 'var(--primary-50)',
              color: 'var(--primary-700)',
            }}
          >
            {confession.sectionCount}개 문답
          </div>
        )}
        {confession.type && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 14,
              background: 'var(--surface-1)',
              color: 'var(--ink-1)',
            }}
          >
            {confession.type}
          </div>
        )}
      </div>
    </button>
  )
}

export default function CatechismPage() {
  const navigate = useNavigate()
  const { data: confessions, isLoading, error } = useQuery({
    queryKey: ['confessions'],
    queryFn: getConfessions,
  })

  const groups = useMemo(() => {
    if (!confessions) return []
    return groupConfessions(confessions)
  }, [confessions])

  const handleCardClick = (confession: ConfessionListItem) => {
    navigate(`/catechism/${confession.code}`)
  }

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      {/* Header */}
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
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>교리서</h1>
        </div>
      </header>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 32px' }}>
            <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>데이터를 불러올 수 없어요</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center' }}>잠시 후 다시 시도해주세요.</p>
          </div>
        ) : !confessions || confessions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>교리서</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.6 }}>
              교리 콘텐츠가 곧 추가됩니다.
            </p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.groupCode} style={{ marginBottom: 32 }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--ink-0)',
                    marginBottom: 16,
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {group.groupTitle}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {group.items.map((confession) => (
                    <ConfessionCard
                      key={confession.code}
                      confession={confession}
                      onClick={() => handleCardClick(confession)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
