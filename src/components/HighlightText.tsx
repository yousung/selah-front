import { CSSProperties, memo } from 'react'

interface Props {
  text: string
  query?: string
  className?: string
  style?: CSSProperties
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const markStyle: CSSProperties = {
  background: 'rgba(29,78,216,0.12)',
  color: '#1d4ed8',
  fontWeight: 700,
  borderRadius: 3,
  padding: '0 1px',
  textDecoration: 'underline',
  textDecorationThickness: '2px',
  textUnderlineOffset: '2px',
  WebkitTextFillColor: '#1d4ed8',
}

const HighlightText = memo(function HighlightText({ text, query, className, style }: Props) {
  if (!query || !query.trim()) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    )
  }

  const escaped = escapeRegExp(query.trim())
  let parts: React.ReactNode[]
  try {
    const re = new RegExp(`(${escaped})`, 'gi')
    const split = text.split(re)
    parts = split.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <mark key={i} className="hl-mark" style={markStyle}>
            {part}
          </mark>
        )
      }
      return part
    })
  } catch {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    )
  }

  return (
    <span className={className} style={style}>
      {parts}
    </span>
  )
})

export default HighlightText
