import type { CSSProperties } from 'react'
import { fs } from '@/lib/fontScale'

interface Props {
  label?: string
  className?: string
  style?: CSSProperties
}

export default function SecretThumbPlaceholder({ label = '비공개', className = 'w-full h-full', style }: Props) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--surface-2) 0%, rgba(61,107,68,0.28) 52%, rgba(201,168,76,0.3) 100%)',
        ...style,
      }}
    >
      <span
        className="font-bold select-none"
        style={{
          color: 'var(--primary-800)',
          fontSize: fs(14),
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </div>
  )
}
