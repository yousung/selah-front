interface Props {
  page: number
  totalPages: number
  onPage: (p: number) => void
}

const btn = (active: boolean, disabled: boolean): React.CSSProperties => ({
  minWidth: '34px',
  height: '34px',
  padding: '0 10px',
  border: '1px solid',
  borderColor: active ? '#007bff' : '#dee2e6',
  borderRadius: '4px',
  background: active ? '#007bff' : '#fff',
  color: disabled ? '#adb5bd' : active ? '#fff' : '#495057',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  fontWeight: active ? 600 : 400,
})

export function Pagination({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px', marginTop: '16px' }}>
      <button disabled={page === 1} onClick={() => onPage(page - 1)} style={btn(false, page === 1)}>‹</button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} style={{ padding: '0 6px', color: '#6c757d', fontSize: '13px' }}>…</span>
          : <button key={p} onClick={() => onPage(p as number)} style={btn(p === page, false)}>{p}</button>
      )}
      <button disabled={page === totalPages} onClick={() => onPage(page + 1)} style={btn(false, page === totalPages)}>›</button>
    </div>
  )
}
