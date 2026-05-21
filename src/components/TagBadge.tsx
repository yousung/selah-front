interface Props {
  tag: string
  size?: 'sm' | 'md'
}

export default function TagBadge({ tag, size = 'sm' }: Props) {
  const upper = tag.toUpperCase()
  const isAR = upper === 'AR'
  const isMR = upper === 'MR'

  if (!isAR && !isMR) return null

  return (
    <span className={isAR ? 'tag-ar' : 'tag-mr'} style={size === 'md' ? { fontSize: 13 } : undefined}>
      <span style={{ fontSize: size === 'md' ? 10 : 8 }}>{isAR ? '●' : '■'}</span>
      {upper}
    </span>
  )
}
