import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import { getConfession, Section } from '@/lib/api'
import SpeedDialFab, { SpeedDialAction } from '@/components/SpeedDialFab'
import { useAudio } from '@/contexts/AudioContext'
import { useQueueStore } from '@/store/queueStore'

function SectionRenderer({ section, onTagClick, headingIndex }: { section: Section; onTagClick: (tag: string) => void; headingIndex?: string }) {
  const hasQuestion = section.question && section.question.trim().length > 0

  // Build id: include both heading anchor and number anchor if available
  const ids: string[] = []
  if (headingIndex) ids.push(`heading-${headingIndex}`)
  if (section.number) ids.push(`section-${section.number}`)

  return (
    <div style={{ marginBottom: 28, scrollMarginTop: 56 }} id={ids[0] || undefined}>
      {hasQuestion ? (
        // Q&A format
        <>
          {section.number && (
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-700)', marginBottom: 8 }}>
              제{section.number}문
            </div>
          )}
          <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-0)', lineHeight: 1.6 }}>
              {section.question}
            </p>
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--ink-0)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {section.content}
            </p>
          </div>
        </>
      ) : (
        // Prose format
        <>
          {section.number && (
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-700)', marginBottom: 8 }}>
              제{section.number}조
            </div>
          )}
          {section.heading && (
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
              {section.heading}
            </h3>
          )}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--ink-0)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {section.content}
            </p>
          </div>
        </>
      )}

      {section.scripture && section.scripture.trim().length > 0 && section.scripture.trim() !== '[]' && (
        <div style={{ background: 'var(--surface-1)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>성경</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-0)', lineHeight: 1.6, fontStyle: 'italic' }}>
            {section.scripture}
          </p>
        </div>
      )}

      {section.tags && section.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {section.tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onTagClick(tag.name)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 14,
                background: 'var(--primary-50)',
                color: 'var(--primary-700)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-100)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--primary-50)'
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CatechismDetailPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { currentVideo } = useAudio()
  const openQueue = useQueueStore((s) => s.openQueue)
  const queueIds = useQueueStore((s) => s.ids)
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [tocOpen, setTocOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [jumpInput, setJumpInput] = useState('')

  if (!code) {
    return (
      <div style={{ background: 'var(--surface-0)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink-2)' }}>Invalid code</p>
      </div>
    )
  }

  // Handle responsive resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { data: confession, isLoading, error } = useQuery({
    queryKey: ['confession', code],
    queryFn: () => getConfession(code),
  })

  const filteredSections = useMemo(() => {
    if (!confession?.sections) return []

    let filtered = confession.sections

    // Filter by active tag filter (only from tag click, no search input)
    if (activeTagFilter) {
      filtered = filtered.filter((section) =>
        section.tags.some((tag) =>
          tag.name.toLowerCase().includes(activeTagFilter.toLowerCase())
        )
      )
    }

    return filtered
  }, [confession?.sections, activeTagFilter])

  const hasNumbers = confession?.sections?.some((s) => s.number)

  // Build TOC from unique headings (using all sections, not filtered)
  const tocItems = useMemo(() => {
    if (!confession?.sections) return []

    const headingMap = new Map<string | null, number>()
    const items: { heading: string | null; index: number }[] = []

    confession.sections.forEach((section) => {
      const heading = section.heading
      if (!headingMap.has(heading)) {
        headingMap.set(heading, items.length)
        if (heading !== null) {
          items.push({ heading, index: items.length })
        }
      }
    })

    return items
  }, [confession?.sections])

  const hasHeadings = tocItems.length > 0

  // Map each section to its heading index for anchor IDs
  const sectionToHeadingIndex = useMemo(() => {
    const map = new Map<string, string>()
    if (!confession?.sections) return map

    confession.sections.forEach((section) => {
      if (section.heading) {
        const headingIndex = tocItems.findIndex((t) => t.heading === section.heading)
        if (headingIndex >= 0) {
          map.set(section.id, String(headingIndex))
        }
      }
    })
    return map
  }, [confession?.sections, tocItems])

  const handleJump = (number: string) => {
    if (!number.trim()) return
    const target = document.getElementById(`section-${number.trim()}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
      // Highlight effect
      target.style.animation = 'none'
      setTimeout(() => {
        target.style.animation = 'highlight 0.5s ease-out'
      }, 10)
    }
    setJumpOpen(false)
    setJumpInput('')
  }

  const handleTagClick = (tagName: string) => {
    if (activeTagFilter === tagName) {
      setActiveTagFilter(null)
    } else {
      setActiveTagFilter(tagName)
    }
  }

  const showMini = !!currentVideo
  const speedDialActions: SpeedDialAction[] = useMemo(() => {
    const actions: SpeedDialAction[] = []

    // Jump action (only if document has numbers)
    if (hasNumbers) {
      actions.push({
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        ),
        label: '점프',
        onClick: () => setJumpOpen(true),
      })
    }

    // Playlist action (only if queue has items)
    if (queueIds.length > 0) {
      actions.push({
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="15" y2="18" />
            <polyline points="17 15 21 18 17 21" />
          </svg>
        ),
        label: '재생목록',
        onClick: () => openQueue(),
      })
    }

    return actions
  }, [hasNumbers, queueIds.length, openQueue])

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <style>{`
        @keyframes highlight {
          0% {
            background-color: rgba(62, 107, 68, 0.1);
          }
          100% {
            background-color: transparent;
          }
        }
        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          0% {
            transform: translateY(100%);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
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
        <div style={{ padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-0)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>교리서</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Hamburger menu for TOC on mobile/tablet */}
            {!isDesktop && hasHeadings && (
              <button
                onClick={() => setTocOpen(!tocOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-0)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Active Filter Display Bar */}
      {confession && activeTagFilter && (
        <div
          style={{
            background: 'var(--surface-1)',
            borderBottom: '1px solid var(--divider)',
            position: 'sticky',
            top: 56,
            zIndex: 9,
            padding: '12px 16px',
          }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-1)' }}>
              태그: <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>{activeTagFilter}</span>
            </span>
            <button
              onClick={() => setActiveTagFilter(null)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: 4,
                background: 'var(--surface-2)',
                color: 'var(--ink-1)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)'
              }}
            >
              ✕
            </button>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {filteredSections.length}개
            </span>
          </div>
        </div>
      )}

      {/* Mobile TOC Drawer */}
      {!isDesktop && hasHeadings && tocOpen && (
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 40,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setTocOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--white)',
              borderTop: '1px solid var(--divider)',
              maxHeight: '70dvh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-0)', marginBottom: 12 }}>
                제목 가이드
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tocItems.map((item) => (
                  <button
                    key={item.index}
                    onClick={() => {
                      const target = document.getElementById(`heading-${item.index}`)
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' })
                      }
                      setTocOpen(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'var(--surface-1)',
                      color: 'var(--ink-0)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary-100)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--surface-1)'
                    }}
                  >
                    {item.heading}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Wrapper with Desktop TOC */}
      <div style={{ display: 'flex', minHeight: 'calc(100dvh - 56px)', overflowY: 'auto' }}>
        {/* Desktop TOC Sidebar */}
        {isDesktop && hasHeadings && (
          <aside
            style={{
              width: 280,
              borderRight: '1px solid var(--divider)',
              background: 'var(--surface-0)',
              padding: '24px 16px',
              position: 'sticky',
              top: 0,
              height: 'fit-content',
              maxHeight: 'calc(100dvh - 56px)',
              overflowY: 'auto',
              alignSelf: 'flex-start',
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-0)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              제목 가이드
            </h3>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tocItems.map((item) => (
                <button
                  key={item.index}
                  onClick={() => {
                    const target = document.getElementById(`heading-${item.index}`)
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--surface-1)',
                    color: 'var(--ink-0)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-100)'
                    e.currentTarget.style.color = 'var(--primary-700)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface-1)'
                    e.currentTarget.style.color = 'var(--ink-0)'
                  }}
                >
                  {item.heading}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, maxWidth: isDesktop ? 'none' : 720, margin: isDesktop ? '0' : '0 auto', padding: '24px 16px 32px', width: '100%' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 32px' }}>
            <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>데이터를 불러올 수 없어요</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>잠시 후 다시 시도해주세요.</p>
          </div>
        ) : confession ? (
          <>
            {!activeTagFilter && (
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-0)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
                  {confession.title}
                </h1>
                {confession.groupTitle && (
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-700)', marginBottom: 12 }}>
                    {confession.groupTitle}
                  </p>
                )}
                {confession.description && (
                  <p style={{ fontSize: 14, color: 'var(--ink-1)', lineHeight: 1.7 }}>
                    {confession.description}
                  </p>
                )}
              </div>
            )}

            <div style={{ borderTop: activeTagFilter ? 'none' : '1px solid var(--divider)', paddingTop: activeTagFilter ? 0 : 24 }}>
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => (
                  <SectionRenderer
                    key={section.id}
                    section={section}
                    onTagClick={handleTagClick}
                    headingIndex={sectionToHeadingIndex.get(section.id)}
                  />
                ))
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', gap: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-0)' }}>결과가 없어요</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>다른 검색어를 시도해보세요.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)' }}>찾을 수 없어요</p>
          </div>
        )}
        </div>
      </div>

      {/* ─── Speed Dial FAB ─── */}
      <SpeedDialFab
        actions={speedDialActions}
        mainLabel="작업"
        offsetBottom={showMini ? 170 : 80}
      />

      {/* ─── Jump Modal (Bottom Sheet on Mobile, Dialog on Desktop) ─── */}
      {jumpOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 40,
            animation: 'fadeIn 0.2s ease-out',
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setJumpOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--white)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTop: '1px solid var(--divider)',
              padding: '20px 16px',
              animation: 'slideUp 0.3s ease-out',
              maxHeight: '60dvh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-0)', marginBottom: 16 }}>
                문 번호로 이동
              </h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="number"
                  placeholder="문 번호 입력"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleJump(jumpInput)
                    }
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: 14,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--divider)',
                    color: 'var(--ink-0)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setJumpOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: 'var(--surface-1)',
                    color: 'var(--ink-0)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface-1)'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={() => handleJump(jumpInput)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: 'var(--primary-700)',
                    color: 'var(--white)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-800)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-700)'
                  }}
                >
                  이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
