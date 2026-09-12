import { fs } from '@/lib/fontScale'
import { useId, useState } from 'react'

const bodyStyle = {
  margin: `${fs(12)} 0 0`, fontFamily: 'var(--font-serif)', fontSize: fs(15),
  lineHeight: fs(28), color: 'var(--ink-1)', whiteSpace: 'pre-line' as const,
  wordBreak: 'keep-all' as const, overflowWrap: 'anywhere' as const,
}

export function PrayerSection({ title, body, headingLevel = 3 }: { title: string; body: string; headingLevel?: 2 | 3 }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <section className="daily-prayer-section" data-open={open}>
      <Heading className="daily-prayer-heading">
        <button className="daily-prayer-trigger" type="button" id={`${id}-trigger`}
          style={headingLevel === 2 ? { fontSize: fs(24), lineHeight: 1.5, fontFamily: 'var(--font-serif)' } : undefined}
          aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen(!open)}>
          <span>{title}</span>
          <svg className="daily-prayer-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </Heading>
      <div id={`${id}-body`} className="daily-prayer-panel" role="region" aria-labelledby={`${id}-trigger`} aria-hidden={!open}>
        <div className="daily-prayer-clip">
          <p className="daily-prayer-text" style={bodyStyle}>{body}</p>
        </div>
      </div>
    </section>
  )
}

export function DailyPrayerBody({ content }: { content: string }) {
  const normalized = content.replace(/\r\n?/g, '\n')
  // Only split standalone numbered headings followed by a blank line.
  const headings = [...normalized.matchAll(/^(\d+)\. [^\n]+\n(?=\s*\n)/gm)]
  const sections = headings.map((match, index) => ({
    title: match[0].trim(),
    body: normalized.slice(match.index! + match[0].length, headings[index + 1]?.index).trim(),
  }))
  const valid = headings.length > 0 && headings.every((match, index) => Number(match[1]) === index + 1)
    && sections.every(section => section.body.length > 0)
  if (!valid) return <p style={bodyStyle}>{content}</p>

  const introduction = normalized.slice(0, headings[0].index).trim()
  return (
    <div style={{ marginTop: fs(16) }}>
      {introduction && <p style={bodyStyle}>{introduction}</p>}
      {sections.map(section => <PrayerSection key={section.title} {...section} />)}
    </div>
  )
}
