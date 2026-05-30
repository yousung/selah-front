interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({ open, title, message, confirmLabel = '삭제', onConfirm, onCancel, loading }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl p-6 w-80 shadow-xl" style={{ background: 'var(--surface-0)' }}>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--ink-0)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-1)' }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-1)' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#B85450', color: '#fff', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
