import { useState } from 'react'

export interface SpeedDialAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

interface SpeedDialFabProps {
  actions: SpeedDialAction[]
  mainIcon?: React.ReactNode
  mainLabel?: string
  color?: string
  offsetBottom?: number
}

export default function SpeedDialFab({
  actions,
  mainIcon,
  mainLabel,
  color = 'var(--primary-700)',
  offsetBottom = 80,
}: SpeedDialFabProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Hide if no actions
  if (actions.length === 0) {
    return null
  }

  const toggleOpen = () => {
    setIsOpen((v) => !v)
  }

  const handleActionClick = (action: SpeedDialAction) => {
    action.onClick()
    setIsOpen(false)
  }

  const handleScrimClick = () => {
    setIsOpen(false)
  }

  return (
    <>
      <style>{`
        @keyframes fabPulse {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes speedDialStagger {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes scrimFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .speed-dial-action {
          animation: speedDialStagger 0.3s ease-out forwards;
        }
      `}</style>

      {/* Scrim */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 40,
            animation: 'scrimFadeIn 0.2s ease-out',
          }}
          onClick={handleScrimClick}
        />
      )}

      {/* Speed Dial Container */}
      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: offsetBottom,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        {/* Action Buttons */}
        {isOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: 12,
              pointerEvents: 'auto',
            }}
          >
            {actions.map((action, idx) => (
              <div
                key={idx}
                className="speed-dial-action"
                style={{
                  animationDelay: `${idx * 0.05}s`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ink-0)',
                      background: 'var(--white)',
                      padding: '6px 12px',
                      borderRadius: 8,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    {action.label}
                  </span>
                  <button
                    onClick={() => handleActionClick(action)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      background: color,
                      color: 'var(--white)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(61, 107, 68, 0.3)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(61, 107, 68, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(61, 107, 68, 0.3)'
                    }}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={toggleOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: color,
            color: 'var(--white)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 16px rgba(61, 107, 68, 0.35)',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = isOpen ? 'scale(1)' : 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(61, 107, 68, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(61, 107, 68, 0.35)'
          }}
          aria-label={mainLabel || '작업'}
          aria-expanded={isOpen}
        >
          <div style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
            {mainIcon || (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </div>
        </button>
      </div>
    </>
  )
}
