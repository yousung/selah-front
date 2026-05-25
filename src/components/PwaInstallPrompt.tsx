import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'selah-pwa-install-dismissed'
const DISMISSED_MAX_AGE = 60 * 60 * 24 * 365 * 20

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function persistDismissed() {
  localStorage.setItem(DISMISSED_KEY, '1')
  document.cookie = `${DISMISSED_KEY}=1; Max-Age=${DISMISSED_MAX_AGE}; Path=/; SameSite=Lax`
}

function hasDismissedInstallPrompt() {
  return localStorage.getItem(DISMISSED_KEY) === '1' || document.cookie.includes(`${DISMISSED_KEY}=1`)
}

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [manualHint, setManualHint] = useState(false)

  useEffect(() => {
    if (isIos()) return
    if (isStandalone() || hasDismissedInstallPrompt()) return
    setVisible(true)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const handleAppInstalled = () => {
      persistDismissed()
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (!visible) return null

  const handleInstall = async () => {
    persistDismissed()
    setVisible(false)

    if (!installPrompt) {
      return
    }

    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const handleNeverShow = () => {
    persistDismissed()
    setVisible(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.32)' }}
    >
      <div
        className="w-full max-w-[420px] rounded-[12px] px-4 py-3 shadow-lg animate-fade-up"
        style={{
          background: 'var(--white)',
          border: '1px solid var(--divider)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
        }}
      >
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-[10px] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-0)' }}>셀라 앱으로 열기</p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
              {manualHint ? '브라우저 메뉴에서 홈 화면에 추가를 선택하세요.' : '홈 화면에 설치하면 더 빠르게 찬양을 재생할 수 있습니다.'}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="h-10 rounded-[8px] text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{ background: 'var(--primary-700)', color: 'var(--white)' }}
          >
            PWA로 설치
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="h-10 rounded-[8px] text-sm font-semibold transition-colors"
            style={{ background: 'var(--surface-1)', color: 'var(--ink-1)' }}
          >
            닫기
          </button>
        </div>

        <button
          type="button"
          onClick={handleNeverShow}
          className="mt-2 block w-full text-center text-[11px]"
          style={{ color: 'var(--ink-3)' }}
        >
          다시보지 않기
        </button>
      </div>
    </div>
  )
}
