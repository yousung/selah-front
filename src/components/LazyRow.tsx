import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 아직 한 번도 안 보인 행의 placeholder 높이 추정치(px). 보인 뒤엔 실제 높이로 대체됨. */
  estimatedHeight?: number
}

/**
 * 뷰포트 밖 행을 실제 unmount해 메모리 절약.
 * - 들어오기 직전(rootMargin 300px) 마운트 → 빠른 스크롤에도 빈 행 안 보임
 * - 나갈 때 unmount 직전 실제 offsetHeight 측정·기억 → placeholder minHeight로 적용
 *   → 이미 본 행 스크롤 복귀 시 위치 흔들림 없음 + 폰트스케일(1/1.5/2x) 높이 자동 흡수
 */
export default function LazyRow({ children, estimatedHeight = 88 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const heightRef = useRef(estimatedHeight)
  const [, force] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
        } else {
          // unmount 전에 실제 높이 측정·기억
          const h = el.offsetHeight
          if (h > 0) heightRef.current = h
          setVisible(false)
          force((n) => n + 1) // placeholder minHeight 갱신 반영
        }
      },
      { rootMargin: '800px 0px 800px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={visible ? undefined : { minHeight: heightRef.current }}>
      {visible ? children : null}
    </div>
  )
}
