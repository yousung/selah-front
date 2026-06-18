import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchConfessions, getConfessionTags, ConfessionSearchResult, Section, Tag } from '@/lib/api'
import HighlightText from './HighlightText'
import { isSearchable } from '@/lib/searchable'
import { makeSnippet } from '@/lib/snippet'

interface Props {
  onClose: () => void
  // Local mode (scoped to a single confession)
  localSections?: Section[]
  confessionTitle?: string
  confessionCode?: string
  onSelectSection?: (sectionId: string) => void
}

interface ResultGroup {
  confessionCode: string
  confessionTitle: string
  items: ConfessionSearchResult[]
}

function groupResults(results: ConfessionSearchResult[]): ResultGroup[] {
  const groupMap = new Map<string, ResultGroup>()
  const order: string[] = []
  for (const r of results) {
    if (!groupMap.has(r.confessionCode)) {
      groupMap.set(r.confessionCode, {
        confessionCode: r.confessionCode,
        confessionTitle: r.confessionTitle,
        items: [],
      })
      order.push(r.confessionCode)
    }
    groupMap.get(r.confessionCode)!.items.push(r)
  }
  return order.map((code) => groupMap.get(code)!)
}

/** Collect unique tags (by id) from any tagged sources, sorted by name */
function uniqueTags(sources: Array<{ tags?: Tag[] | null }>): Tag[] {
  const seen = new Map<string, Tag>()
  for (const s of sources) {
    for (const tag of s.tags ?? []) {
      if (!seen.has(tag.id)) seen.set(tag.id, tag)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function resultLabel(item: ConfessionSearchResult): string {
  if (item.number != null) {
    return `${item.number}문`
  }
  return item.heading || `${item.ordering + 1}`
}

/** Convert a Section to a ConfessionSearchResult shape for unified rendering */
function sectionToResult(
  section: Section,
  confessionCode: string,
  confessionTitle: string,
  q: string,
): ConfessionSearchResult {
  const contentSnippet = makeSnippet(section.content || '', q || undefined)
  return {
    confessionCode,
    confessionTitle,
    confessionType: '',
    sectionId: section.id,
    ordering: section.ordering ?? 0,
    number: section.number ?? null,
    heading: section.heading ?? null,
    question: section.question ?? null,
    contentSnippet,
    tags: section.tags ?? [],
  }
}

const inputStyle: React.CSSProperties = {
  height: 40,
  background: 'var(--surface-1)',
  border: '1px solid var(--divider)',
  borderRadius: 10,
  color: 'var(--ink-0)',
  fontSize: 14,
  outline: 'none',
}

export default function CatechismSearchSheet({
  onClose,
  localSections,
  confessionTitle = '',
  confessionCode = '',
  onSelectSection,
}: Props) {
  const navigate = useNavigate()
  const isLocalMode = !!localSections
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [jumpValue, setJumpValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jumpDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Whether any section in this confession has a number (Q&A catechisms)
  const hasNumbers = useMemo(
    () => isLocalMode && !!(localSections?.some((s) => s.number != null)),
    [isLocalMode, localSections],
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleQueryChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(v.trim()), 300)
  }

  // Jump: find section by exact number match (String coercion to handle int runtime values)
  const handleJump = (value: string) => {
    if (!value.trim() || !localSections) return
    const target = localSections.find(
      (s) => s.number != null && String(s.number).trim() === value.trim(),
    )
    if (target) {
      onSelectSection?.(target.id)
      onClose()
    }
  }

  const handleJumpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (jumpDebounceRef.current) clearTimeout(jumpDebounceRef.current)
      handleJump(jumpValue)
    }
  }

  // Auto-jump after a 0.5s debounce — no Enter needed
  const handleJumpChange = (v: string) => {
    setJumpValue(v)
    if (jumpDebounceRef.current) clearTimeout(jumpDebounceRef.current)
    if (!v.trim()) return
    jumpDebounceRef.current = setTimeout(() => handleJump(v), 500)
  }

  // ── Remote mode: fetch tags + search via API ──
  const { data: remoteTags } = useQuery({
    queryKey: ['confession-tags'],
    queryFn: getConfessionTags,
    enabled: !isLocalMode,
  })

  const hasCriteria = isSearchable(debouncedQuery) || activeTags.length > 0

  const { data: remoteResults, isLoading: remoteLoading } = useQuery({
    queryKey: ['confession-search', debouncedQuery, activeTags.join(',')],
    queryFn: () => searchConfessions(debouncedQuery, activeTags),
    enabled: !isLocalMode && hasCriteria,
  })

  // Remote: tag universe scoped to the text query only (stable across tag toggles).
  // queryKey matches the combined search when no tags are active → shares cache, no extra fetch.
  const { data: remoteTextResults } = useQuery({
    queryKey: ['confession-search', debouncedQuery, ''],
    queryFn: () => searchConfessions(debouncedQuery),
    enabled: !isLocalMode && isSearchable(debouncedQuery),
  })

  // ── Local mode: derive tags + filter sections client-side (text search only) ──
  const localTags = useMemo<Tag[]>(() => {
    if (!isLocalMode || !localSections) return []
    return uniqueTags(localSections)
  }, [isLocalMode, localSections])

  // Local: sections matching the text query only (ignores activeTag) — for scoped tag chips
  const localTextResults = useMemo<Section[]>(() => {
    if (!isLocalMode || !localSections || !isSearchable(debouncedQuery)) return []
    const q = debouncedQuery.trim().toLowerCase()
    return localSections.filter(
      (section) =>
        !!section.question?.toLowerCase().includes(q) ||
        !!section.content?.toLowerCase().includes(q) ||
        !!section.heading?.toLowerCase().includes(q),
    )
  }, [isLocalMode, localSections, debouncedQuery])

  const localResults = useMemo<ConfessionSearchResult[]>(() => {
    if (!isLocalMode || !localSections) return []
    if (!hasCriteria) return []
    const q = debouncedQuery.trim().toLowerCase()
    return localSections
      .filter((section) => {
        const sectionTagNames = (section.tags ?? []).map((t) => t.name)
        const matchesTag =
          activeTags.length === 0 ||
          activeTags.every((name) => sectionTagNames.includes(name))
        const matchesQuery =
          !isSearchable(debouncedQuery) ||
          !!section.question?.toLowerCase().includes(q) ||
          !!section.content?.toLowerCase().includes(q) ||
          !!section.heading?.toLowerCase().includes(q)
        return matchesTag && matchesQuery
      })
      .map((section) => sectionToResult(section, confessionCode, confessionTitle, debouncedQuery))
  }, [isLocalMode, localSections, debouncedQuery, activeTags, hasCriteria, confessionCode, confessionTitle])

  // ── Unified values for rendering ──
  // When a text query is active, scope tag chips to tags present in the matched
  // results; otherwise show the full tag list (browse mode).
  const tags = useMemo<Tag[]>(() => {
    const searchable = isSearchable(debouncedQuery)
    if (isLocalMode) {
      return searchable ? uniqueTags(localTextResults) : localTags
    }
    return searchable ? uniqueTags(remoteTextResults ?? []) : (remoteTags ?? [])
  }, [isLocalMode, debouncedQuery, localTextResults, localTags, remoteTextResults, remoteTags])
  const isLoading = isLocalMode ? false : remoteLoading
  const groups = useMemo(
    () => groupResults(isLocalMode ? localResults : (remoteResults ?? [])),
    [isLocalMode, localResults, remoteResults],
  )

  const toggleTag = (name: string) => {
    setActiveTags((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  const removeTag = (name: string) => {
    setActiveTags((prev) => prev.filter((n) => n !== name))
  }

  const handleResultClick = (item: ConfessionSearchResult) => {
    if (isLocalMode) {
      onSelectSection?.(item.sectionId)
      onClose()
    } else {
      navigate(`/catechism/${item.confessionCode}`, {
        state: { scrollToSectionId: item.sectionId },
      })
      onClose()
    }
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease-out' }}
      onClick={handleBackdrop}
    >
      <style>{`
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes popIn { 0% { opacity: 0; transform: translateY(8px) scale(0.98); } 100% { opacity: 1; transform: none; } }
      `}</style>
      <div
        className="w-full flex flex-col"
        style={{
          background: 'var(--white)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          height: '90dvh',
          animation: 'popIn 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: [jump input?] + search input + close */}
        <div
          className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          {/* Jump input — local mode + numbered catechisms only */}
          {isLocalMode && hasNumbers && (
            <input
              type="text"
              inputMode="numeric"
              value={jumpValue}
              onChange={(e) => handleJumpChange(e.target.value)}
              onKeyDown={handleJumpKeyDown}
              placeholder="#"
              aria-label="문 번호로 이동"
              style={{
                ...inputStyle,
                width: 64,
                flexShrink: 0,
                textAlign: 'center',
                padding: '0 8px',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary-700)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--divider)')}
            />
          )}

          {/* Search input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              style={{ color: 'var(--ink-3)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={isLocalMode ? `${confessionTitle} 내 검색` : '교리서 검색'}
              className="w-full text-sm outline-none pl-9 pr-3"
              style={{
                ...inputStyle,
                width: '100%',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary-700)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--divider)')}
            />
          </div>

          <button
            onClick={onClose}
            style={{ color: 'var(--ink-2)', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Selected tags — removable chips */}
        {activeTags.length > 0 && (
          <div
            className="flex-shrink-0 px-4 py-2"
            style={{ borderBottom: '1px solid var(--divider)', display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {activeTags.map((name) => (
              <button
                key={name}
                onClick={() => removeTag(name)}
                aria-label={`${name} 태그 제거`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 8px 4px 12px',
                  borderRadius: 20,
                  background: 'var(--primary-800)',
                  color: 'var(--white)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {name}
                <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.85 }}>✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="overflow-y-auto flex-1" style={{ minHeight: 120 }}>
          {!hasCriteria ? (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-3)' }}>
              {isLocalMode && hasNumbers
                ? '번호 입력으로 이동하거나 검색어·태그를 입력하세요'
                : '검색어를 입력하거나 태그를 선택하세요'}
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--primary-700)' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </div>
          ) : groups.length === 0 ? (
            <p className="px-4 py-10 text-sm text-center" style={{ color: 'var(--ink-2)' }}>
              검색 결과가 없어요
            </p>
          ) : (
            <div style={{ padding: '8px 0 16px' }}>
              {groups.map((group) => (
                <section key={group.confessionCode} style={{ marginBottom: 8 }}>
                  {/* Show group title only in remote mode (multi-confession) */}
                  {!isLocalMode && (
                    <h3
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--primary-700)',
                        padding: '10px 16px 6px',
                      }}
                    >
                      {group.confessionTitle}
                    </h3>
                  )}
                  {group.items.map((item) => (
                    <button
                      key={item.sectionId}
                      onClick={() => handleResultClick(item)}
                      className="w-full text-left transition-colors"
                      style={{
                        display: 'block',
                        padding: '10px 16px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--divider)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-700)', flexShrink: 0 }}>
                          {resultLabel(item)}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--ink-0)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          <HighlightText
                            text={item.question || item.contentSnippet}
                            query={debouncedQuery}
                          />
                        </span>
                      </div>
                      {item.question && item.contentSnippet && (
                        <p
                          style={{
                            fontSize: 13,
                            color: 'var(--ink-2)',
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          <HighlightText
                            text={item.contentSnippet}
                            query={debouncedQuery}
                          />
                        </p>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {item.tags.map((tag) => {
                            const isActive = activeTags.includes(tag.name)
                            return (
                              <span
                                key={tag.id}
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  // Tag click adds the tag to the search filter — not navigation.
                                  e.stopPropagation()
                                  toggleTag(tag.name)
                                }}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: isActive ? 'var(--primary-800)' : 'var(--primary-50)',
                                  color: isActive ? 'var(--white)' : 'var(--primary-700)',
                                  cursor: 'pointer',
                                }}
                              >
                                {tag.name}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </button>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Footer: tag chips */}
        {tags.length > 0 && (
          <div
            className="flex-shrink-0 px-4 py-3"
            style={{ borderTop: '1px solid var(--divider)' }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 96, overflowY: 'auto' }}>
              {tags.map((tag) => {
                const isActive = activeTags.includes(tag.name)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: isActive ? 'var(--primary-800)' : 'var(--surface-2)',
                      color: isActive ? 'var(--white)' : 'var(--ink-1)',
                      border: isActive ? 'none' : '1px solid var(--divider)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
