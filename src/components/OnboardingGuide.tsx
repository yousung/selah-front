import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const ONBOARDING_KEY = 'selah-onboarding-v1'

interface StepDef {
  selector: string
  title: string
  desc: string
  nextRoute?: string
  autoAdvanceOn?: string
  pad?: number
}

const STEPS: StepDef[] = [
  {
    selector: '[data-tour="my-tab"]',
    title: 'MY 탭 열기',
    desc: '화면 아래 MY를 탭하세요. 설정 메뉴로 이동합니다.',
    nextRoute: '/my',
    autoAdvanceOn: '/my',
    pad: 14,
  },
  {
    selector: '[data-tour="settings-link"]',
    title: '앱 설정 열기',
    desc: '앱 설정을 탭해 주세요.',
    nextRoute: '/settings',
    autoAdvanceOn: '/settings',
    pad: 6,
  },
  {
    selector: '[data-tour="setting-media"]',
    title: '미디어 모드 → 오디오',
    desc: '오디오를 선택하면 영상 없이 소리만 재생해 데이터를 크게 아낄 수 있습니다.',
    pad: 6,
  },
  {
    selector: '[data-tour="setting-quality"]',
    title: '음질 → 저음질',
    desc: '저음질로 두면 가장 적은 데이터로 또렷하게 들을 수 있습니다.',
    pad: 6,
  },
  {
    selector: '[data-tour="setting-font"]',
    title: '글자 크기 → 매우크게',
    desc: '글씨가 잘 안 보이시는 분은 매우크게를 권장합니다.',
    pad: 6,
  },
  {
    selector: '[data-tour="setting-cache"]',
    title: '저장 용량 → 보통 이상',
    desc: '보통 이상으로 설정하면 더 많은 찬송과 설교를 기기에 저장해 오프라인에서도 들을 수 있습니다.',
    pad: 6,
  },
]

const TOTAL = STEPS.length
const DARK = 'rgba(0,0,0,0.72)'
const TOPBAR_H = 52
const TIP_W = 300
const TIP_GAP = 14
const ARROW_SIZE = 8
const SCREEN_PAD = 16

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(() => localStorage.getItem(ONBOARDING_KEY) !== '1')
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const prevPath = useRef(location.pathname)
  const rafRef = useRef<number>(0)

  const findEl = useCallback(() => {
    const sel = STEPS[step]?.selector
    if (!sel) return
    let tries = 0
    const attempt = () => {
      // display:none 요소는 제외 — 모바일/PC 레이아웃 전환 대응
      const el = Array.from(document.querySelectorAll<HTMLElement>(sel))
        .find(e => e.offsetWidth > 0 && e.offsetHeight > 0)
      if (el) {
        const r = el.getBoundingClientRect()
        const vh = document.documentElement.clientHeight || window.innerHeight
        if (r.top < 0 || r.bottom > vh) {
          el.scrollIntoView({ block: 'center' })
        }
        setRect(el.getBoundingClientRect())
      } else if (tries < 15) {
        tries++
        rafRef.current = requestAnimationFrame(attempt)
      }
    }
    cancelAnimationFrame(rafRef.current)
    setRect(null)
    rafRef.current = requestAnimationFrame(attempt)
  }, [step])

  useEffect(() => {
    if (!visible) return
    findEl()
    return () => cancelAnimationFrame(rafRef.current)
  }, [findEl, visible])

  useEffect(() => {
    if (!visible) return
    const onResize = () => findEl()
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('scroll', onResize, { passive: true, capture: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, { capture: true })
    }
  }, [findEl, visible])

  useEffect(() => {
    if (!visible) return
    const cur = STEPS[step]
    const path = location.pathname
    if (cur?.autoAdvanceOn && path === cur.autoAdvanceOn && prevPath.current !== path) {
      setStep((s) => s + 1)
    }
    prevPath.current = path
  }, [location.pathname, step, visible])

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setVisible(false)
  }

  function advance() {
    if (step >= TOTAL - 1) { dismiss(); return }
    const cur = STEPS[step]
    if (cur.nextRoute && location.pathname !== cur.nextRoute) {
      navigate(cur.nextRoute)
    } else {
      setStep((s) => s + 1)
    }
  }

  if (!visible) return null

  const cur = STEPS[step]
  const PAD = cur.pad ?? 8
  const isLast = step === TOTAL - 1
  const isAuto = !!cur.autoAdvanceOn

  const ww = document.documentElement.clientWidth || window.innerWidth
  const wh = document.documentElement.clientHeight || window.innerHeight
  const tipWidth = Math.min(TIP_W, ww - SCREEN_PAD * 2)
  const TIP_CARD_H = 190  // 카드 예상 최대 높이 (safe upper bound)

  // spotlight bounds
  const sl = rect ? Math.max(0, rect.left - PAD) : ww * 0.1
  const st = rect ? Math.max(0, rect.top - PAD) : wh * 0.4
  const sr = rect ? Math.min(ww, rect.right + PAD) : ww * 0.9
  const sb = rect ? Math.min(wh, rect.bottom + PAD) : wh * 0.6
  const sw = sr - sl
  const sh = sb - st
  const midX = (sl + sr) / 2
  const midY = (st + sb) / 2

  // 툴팁 박스: 스포트라이트 위/아래 결정
  const tipBelow = midY < wh * 0.55
  let tipTop: number
  let arrowUp: boolean  // true = 화살표가 위를 가리킴 (박스가 아래에 있을 때)
  if (!rect) {
    tipTop = wh / 2 - 80
    arrowUp = false
  } else if (tipBelow) {
    // 스포트라이트가 위쪽 → 박스를 아래에
    tipTop = sb + TIP_GAP
    arrowUp = true
  } else {
    // 스포트라이트가 아래쪽 → 박스를 위에
    tipTop = st - TIP_GAP - TIP_CARD_H
    arrowUp = false
  }
  // 화면 경계 클램프: 상단바 아래 ~ 화면 하단 안쪽
  tipTop = Math.max(TOPBAR_H + SCREEN_PAD, Math.min(wh - TIP_CARD_H - SCREEN_PAD, tipTop))

  // 박스 X: 스포트라이트 중심 기준, 화면 경계 안에 클램프
  let tipLeft = midX - tipWidth / 2
  tipLeft = Math.max(SCREEN_PAD, Math.min(ww - tipWidth - SCREEN_PAD, tipLeft))

  // 화살표 X: 스포트라이트 중심이 박스 위에 오도록
  const arrowX = Math.min(
    Math.max(midX - tipLeft - ARROW_SIZE, ARROW_SIZE * 2),
    tipWidth - ARROW_SIZE * 4
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* 4-strip dark overlay */}
      <div style={{ position: 'absolute', inset: `0 0 ${wh - st}px 0`, background: DARK, pointerEvents: 'all' }} />
      <div style={{ position: 'absolute', inset: `${sb}px 0 0 0`, background: DARK, pointerEvents: 'all' }} />
      <div style={{ position: 'absolute', top: st, bottom: wh - sb, left: 0, width: sl, background: DARK, pointerEvents: 'all' }} />
      <div style={{ position: 'absolute', top: st, bottom: wh - sb, left: sr, right: 0, background: DARK, pointerEvents: 'all' }} />

      {/* spotlight ring */}
      {rect && (
        <div style={{
          position: 'absolute',
          left: sl, top: st, width: sw, height: sh,
          borderRadius: 14,
          boxShadow: '0 0 0 2.5px rgba(255,255,255,0.6), 0 0 0 5px rgba(255,255,255,0.12)',
          pointerEvents: 'none',
        }} />
      )}

      {/* top bar: step dots + counter + skip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: TOPBAR_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        pointerEvents: 'all',
      }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 6,
              width: i === step ? 22 : 6,
              borderRadius: 999,
              background: i <= step ? 'var(--primary-700)' : 'rgba(255,255,255,0.28)',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>
        <span style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 700,
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        }}>
          {step + 1} / {TOTAL}
        </span>
        <button type="button" onClick={dismiss} style={{
          background: 'rgba(255,255,255,0.12)', border: 'none',
          color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600,
          borderRadius: 999, padding: '5px 12px', cursor: 'pointer',
        }}>건너뛰기</button>
      </div>

      {/* 툴팁 카드 */}
      <div style={{
        position: 'absolute',
        left: tipLeft,
        top: tipTop,
        width: tipWidth,
        pointerEvents: 'all',
      }}>
        {/* 위쪽 화살표 (박스가 스포트라이트 아래에 있을 때) */}
        {arrowUp && rect && (
          <div style={{
            position: 'absolute',
            top: -ARROW_SIZE,
            left: arrowX,
            width: 0, height: 0,
            borderLeft: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            borderBottom: `${ARROW_SIZE}px solid #fff`,
          }} />
        )}

        {/* 카드 본체 */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-0, #111)', margin: '0 0 6px' }}>
            {cur.title}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2, #555)', lineHeight: 1.65, margin: '0 0 16px' }}>
            {cur.desc}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#aaa' }}>
              {isAuto ? '탭하면 자동으로 넘어갑니다' : '설정 후 다음을 눌러주세요'}
            </span>
            <button type="button" onClick={advance} style={{
              background: 'var(--primary-700, #4f46e5)', color: '#fff',
              border: 'none', borderRadius: 999, cursor: 'pointer',
              padding: '7px 18px', fontSize: 13, fontWeight: 700,
              flexShrink: 0, marginLeft: 10,
            }}>
              {isLast ? '완료' : '다음 →'}
            </button>
          </div>
        </div>

        {/* 아래쪽 화살표 (박스가 스포트라이트 위에 있을 때) */}
        {!arrowUp && rect && (
          <div style={{
            position: 'absolute',
            bottom: -ARROW_SIZE,
            left: arrowX,
            width: 0, height: 0,
            borderLeft: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            borderTop: `${ARROW_SIZE}px solid #fff`,
          }} />
        )}
      </div>
    </div>
  )
}
