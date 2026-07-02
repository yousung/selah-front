import { useEffect } from 'react'
import { fs } from '@/lib/fontScale'

/** 하단에 잠깐 뜨는 안내 팝업. duration 후 자동으로 닫히며, 탭하면 즉시 닫힌다. */
export default function Toast({ message, onClose, duration = 3000 }: { message: string; onClose: () => void; duration?: number }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div
      onClick={onClose}
      className="fixed left-1/2 z-[300] cursor-pointer animate-fade-in"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        transform: 'translateX(-50%)',
        width: 'min(320px, calc(100vw - 40px))',
        padding: '12px 16px',
        borderRadius: 12,
        background: 'var(--ink-0)',
        color: 'var(--surface-0)',
        fontSize: fs(13),
        fontWeight: 600,
        lineHeight: 1.5,
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      }}
    >
      {message}
    </div>
  )
}
