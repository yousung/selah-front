/** iOS(iPhone/iPad, Safari·PWA 포함) 여부. iPadOS는 UA가 Mac으로 위장하므로 터치포인트로 보완 판별한다. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * iOS 버전 문자열(예: `'18.7'`). 진단 리포트 전용 — **분기 판정에 쓰지 마라**(기기 판별은
 * `isIOS()` 하나로 통일). UA에 `OS 18_7` 형태가 없으면(데스크탑 UA로 위장한 iPadOS 등) null.
 */
export function iosVersion(): string | null {
  if (typeof navigator === 'undefined') return null
  const m = /OS (\d+)[_.](\d+)(?:[_.](\d+))?/.exec(navigator.userAgent)
  if (!m) return null
  return m[3] ? `${m[1]}.${m[2]}.${m[3]}` : `${m[1]}.${m[2]}`
}
