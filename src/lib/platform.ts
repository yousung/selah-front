/** iOS(iPhone/iPad, Safari·PWA 포함) 여부. iPadOS는 UA가 Mac으로 위장하므로 터치포인트로 보완 판별한다. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
