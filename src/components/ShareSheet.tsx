import { createPortal } from 'react-dom'
import { useSettingsStore } from '@/store/settingsStore'

interface Props {
  onClose: () => void
  /** 셀라 공유 — 셀라 플레이어 링크(기존 공유) */
  onShareSelah: () => void
  /** 유튜브 공유 — 원본 YouTube 주소 */
  onShareYoutube: () => void
}

/** 카카오톡 공유 대상 선택 시트 — 셀라 공유 / 유튜브 공유. */
export default function ShareSheet({ onClose, onShareSelah, onShareYoutube }: Props) {
  const fontScale = useSettingsStore((s) => s.fontScale)
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const pick = (share: () => void) => {
    onClose()
    share()
  }

  const options = [
    { key: 'selah', label: '셀라 공유', hint: '셀라 앱에서 열리는 링크를 보냅니다', color: 'var(--accent-500)', onClick: () => pick(onShareSelah) },
    { key: 'youtube', label: '유튜브 공유', hint: '원본 YouTube 영상 주소를 보냅니다', color: '#FF0000', onClick: () => pick(onShareYoutube) },
  ]

  // body로 portal — <main> 안에 두면 모바일 하단 메뉴(<nav>)가 시트 아래쪽을 덮는다. 글자 크기는 직접 이어받는다.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)', ['--font-scale' as string]: fontScale } as React.CSSProperties}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="카카오톡 공유"
    >
      <div
        className="w-full rounded-t-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--white)', maxHeight: 'calc(100dvh - 32px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--divider)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink-0)' }}>카카오톡 공유</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{ color: 'var(--ink-2)', fontSize: 20, lineHeight: 1, minWidth: 44, minHeight: 44, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 py-1">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={o.onClick}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity active:opacity-60"
              style={{ minHeight: 60 }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0 rounded-full"
                style={{ width: 40, height: 40, background: o.color, color: '#fff' }}
                aria-hidden="true"
              >
                {o.key === 'selah' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.99 3 3 6.13 3 9.99c0 2.46 1.63 4.62 4.08 5.84-.18.63-.65 2.28-.74 2.64-.12.45.16.45.34.33.14-.1 2.27-1.54 3.19-2.17.36.05.74.08 1.13.08 5.01 0 9-3.13 9-6.99S17.01 3 12 3z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z" />
                  </svg>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-base font-medium" style={{ color: 'var(--ink-0)' }}>{o.label}</span>
                <span className="block text-sm" style={{ color: 'var(--ink-3)' }}>{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
