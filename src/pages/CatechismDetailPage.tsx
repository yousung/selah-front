import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import { getConfession, Section } from '@/lib/api'
import { useAudio } from '@/contexts/AudioContext'

interface TocGroup {
  majorSection: string | null
  items: { number: string | null; heading: string | null; sectionId: string; numberEnd?: string | null }[]
}

interface TocListProps {
  tocGroups: TocGroup[]
  sectionAnchors: Map<string, string>
  onItemClick: () => void
  isMobile?: boolean
}

function TocList({ tocGroups, sectionAnchors, onItemClick, isMobile }: TocListProps) {
  const [expanded, setExpanded] = useState(true)

  const totalItems = tocGroups.reduce((sum, g) => sum + g.items.length, 0)
  const itemsToShow = expanded ? totalItems : Math.min(totalItems, 5)
  let itemCount = 0

  const handleItemClick = (sectionId: string) => {
    const anchor = sectionAnchors.get(sectionId)
    if (anchor) {
      const target = document.getElementById(anchor)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' })
      }
    }
    onItemClick()
  }

  return (
    <>
      {tocGroups.map((group, groupIdx) => (
        <div key={groupIdx} style={{ marginBottom: isMobile ? 16 : 12 }}>
          {group.majorSection && (
            <div
              style={{
                fontSize: isMobile ? 12 : 11,
                fontWeight: 700,
                color: 'var(--ink-2)',
                padding: isMobile ? '8px 12px' : '8px 12px',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                borderBottom: '1px solid var(--divider)',
              }}
            >
              {group.majorSection}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 8 }}>
            {group.items.map((item) => {
              itemCount++
              const shouldShow = itemCount <= itemsToShow

              return shouldShow ? (
                <button
                  key={item.sectionId}
                  onClick={() => handleItemClick(item.sectionId)}
                  style={{
                    padding: isMobile ? '8px 12px' : '8px 12px',
                    borderRadius: 6,
                    background: 'var(--surface-1)',
                    color: 'var(--ink-0)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: isMobile ? 13 : 12,
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
                  {item.number && (
                    <span style={{ fontWeight: 600, color: 'var(--primary-700)', marginRight: 8 }}>
                      제{item.numberEnd ? `${item.number}-${item.numberEnd}` : item.number}{item.heading ? '문' : '조'}
                    </span>
                  )}
                  {item.heading}
                </button>
              ) : null
            })}
          </div>
        </div>
      ))}

      {totalItems > 5 && (
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--divider)', marginTop: 12 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%',
              padding: isMobile ? '8px 12px' : '8px 12px',
              borderRadius: 6,
              background: 'var(--surface-1)',
              color: 'var(--primary-700)',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? 12 : 11,
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--primary-50)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-1)'
            }}
          >
            {expanded ? '접기' : `더보기 +${totalItems - 5}`}
          </button>
        </div>
      )}
    </>
  )
}

function SectionRenderer({ section, onTagClick, sectionAnchor }: { section: Section; onTagClick: (tag: string) => void; sectionAnchor: string }) {
  const hasQuestion = section.question && section.question.trim().length > 0
  const headingEqualQuestion = section.heading && section.question && section.heading.trim() === section.question.trim()

  return (
    <div style={{ marginBottom: 28, scrollMarginTop: 56 }} id={sectionAnchor}>
      {hasQuestion ? (
        // Q&A format
        <>
          {section.number && (
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-700)', marginBottom: 8 }}>
              제{section.number}문
            </div>
          )}
          {section.heading && !headingEqualQuestion && (
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-0)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
              {section.heading}
            </h3>
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

  // Handle jump input debounce (0.5s auto-jump)
  useEffect(() => {
    if (!jumpOpen || !jumpInput.trim()) return

    const timer = setTimeout(() => {
      handleJump(jumpInput)
    }, 500)

    return () => clearTimeout(timer)
  }, [jumpInput, jumpOpen])

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

  // Generate unique stable anchors for all sections
  const sectionAnchors = useMemo(() => {
    const anchors = new Map<string, string>()
    if (!confession?.sections) return anchors

    confession.sections.forEach((section) => {
      const anchor = section.number ? `section-${section.number}` : `sec-${section.id}`
      anchors.set(section.id, anchor)
    })
    return anchors
  }, [confession?.sections])

  // Build TOC with majorSection grouping (using all sections, not filtered)
  const tocGroups = useMemo(() => {
    if (!confession?.sections) return []

    const groups: TocGroup[] = []
    let currentGroup: TocGroup | null = null

    confession.sections.forEach((section) => {
      const newMajorSection = section.majorSection

      // Check if we need a new group
      if (!currentGroup || currentGroup.majorSection !== newMajorSection) {
        currentGroup = {
          majorSection: newMajorSection,
          items: [],
        }
        groups.push(currentGroup)
      }

      // Add section to group (only if it has a heading or number for TOC display)
      if (section.heading || section.number) {
        const newItem = {
          number: section.number,
          heading: section.heading,
          sectionId: section.id,
          numberEnd: null as string | null,
        }

        // Check if we can merge with the last item (same heading, consecutive numbers)
        const lastItem = currentGroup.items[currentGroup.items.length - 1]
        if (
          lastItem &&
          lastItem.heading === newItem.heading &&
          lastItem.number &&
          newItem.number &&
          !lastItem.numberEnd
        ) {
          // Convert last item to a range merge
          lastItem.numberEnd = newItem.number
        } else if (
          lastItem &&
          lastItem.heading === newItem.heading &&
          lastItem.number &&
          newItem.number &&
          lastItem.numberEnd
        ) {
          // Extend the range in the last item
          lastItem.numberEnd = newItem.number
        } else {
          // No merge, add as new item
          currentGroup.items.push(newItem)
        }
      }
    })

    return groups
  }, [confession?.sections])

  const hasHeadings = tocGroups.some((g) => g.items.length > 0)

  const handleJump = (number: string) => {
    if (!number.trim()) return
    const anchor = `section-${number.trim()}`
    const target = document.getElementById(anchor)
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
              <TocList
                tocGroups={tocGroups}
                sectionAnchors={sectionAnchors}
                onItemClick={() => setTocOpen(false)}
                isMobile
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Wrapper with Desktop TOC */}
      <div style={{ display: 'flex', minHeight: 'calc(100dvh - 56px)' }}>
        {/* Desktop TOC Sidebar */}
        {isDesktop && hasHeadings && (
          <aside
            style={{
              width: 280,
              borderRight: '1px solid var(--divider)',
              background: 'var(--surface-0)',
              padding: '24px 16px',
              position: 'sticky',
              top: 56,
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
              <TocList
                tocGroups={tocGroups}
                sectionAnchors={sectionAnchors}
                onItemClick={() => {}}
              />
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
                <>
                  {filteredSections.map((section, idx) => {
                    // Determine if we need to show a majorSection divider
                    const prevSection = idx > 0 ? filteredSections[idx - 1] : null
                    const showMajorSectionDivider =
                      section.majorSection &&
                      (prevSection === null || prevSection.majorSection !== section.majorSection)

                    return (
                      <div key={section.id}>
                        {showMajorSectionDivider && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--ink-2)',
                              padding: '16px 0 12px',
                              marginBottom: 16,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              borderTop: '1px solid var(--divider)',
                            }}
                          >
                            {section.majorSection}
                          </div>
                        )}
                        <SectionRenderer
                          section={section}
                          onTagClick={handleTagClick}
                          sectionAnchor={sectionAnchors.get(section.id) || `sec-${section.id}`}
                        />
                      </div>
                    )
                  })}
                </>
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

      {/* ─── Magnifier Jump FAB ─── */}
      {hasNumbers && (
        <button
          onClick={() => setJumpOpen(true)}
          style={{
            position: 'fixed',
            right: 16,
            bottom: showMini ? 170 : 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--primary-700)',
            color: 'var(--white)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 16px rgba(61, 107, 68, 0.35)',
            zIndex: 50,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(61, 107, 68, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(61, 107, 68, 0.35)'
          }}
          aria-label="문 번호로 이동"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      )}

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
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12, textAlign: 'center' }}>
                숫자를 입력하면 자동으로 이동합니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
