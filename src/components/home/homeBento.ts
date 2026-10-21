import type { CSSProperties } from 'react'

export const clamp = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: lines,
  overflow: 'hidden',
})

// 홈 레이아웃 CSS — HomePage가 <style>로 주입한다. 컬럼 수는 화면 폭 × 글자 크기(.home[data-fs])로 결정.
// 하나의 체계: 면은 --surface-1 한 가지, 모서리 16(블록)/8(썸네일), 간격 8의 배수(블록 안 18~22 · 블록 사이 10~12 · 섹션 사이 36)
//  · .hb         : 모든 블록 공통 면 (오늘의 암송 · 지금의 기도 · 설교 타일 · 찬송 타일)
//  · .home-read  : 오늘의 암송 · 지금의 기도. 1024+ & 2x 미만이면 나란히(같은 높이), 그 외 세로 스택
//  · .st-grid    : 이번 주 설교 텍스트 타일 (data-n=편수). 폰 1열, 768+ 편수만큼 열(1.5x 이상 768대는 1열), 1024+ 2x는 1열
//  · .mosaic     : 찬송 4곡. 폰 2열, 768+ 4열 (2x는 1024+에서만 4열)
export const HOME_CSS = `
.home{display:flex;flex-direction:column;gap:36px;min-width:0}
.hb{background:var(--surface-1);border-radius:16px;padding:18px 18px;min-width:0;animation:homeIn .5s ease-out both}
@media (min-width:768px){.hb{padding:22px}}

.home-read{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;min-width:0}
.home-read:empty{display:none}
.home-read>*{display:flex;flex-direction:column}
@media (min-width:1024px){
  .home-read{gap:12px}
  .home[data-fs="1"] .home-read,.home[data-fs="1.5"] .home-read{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
  .home-read>:only-child{grid-column:1/-1}
}
.hp-body{-webkit-line-clamp:3}
@media (min-width:1024px){.home[data-fs="1"] .hp-body,.home[data-fs="1.5"] .hp-body{-webkit-line-clamp:4}}

.st-grid{display:grid;gap:10px;grid-template-columns:minmax(0,1fr);min-width:0}
@media (min-width:768px){
  .st-grid{gap:12px}
  .home[data-fs="1"] .st-grid[data-n="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  .home[data-fs="1"] .st-grid[data-n="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (min-width:1024px){
  .home[data-fs="1.5"] .st-grid[data-n="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  .home[data-fs="1.5"] .st-grid[data-n="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
  .home[data-fs="2"] .st-grid[data-n="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
}

button.hb{display:flex;flex-direction:column;width:100%;text-align:left;color:inherit;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background-color .2s ease}
button.hb:hover{background:var(--surface-2)}
.hb:focus-visible,.hb button:focus-visible{outline:2px solid var(--primary-700);outline-offset:3px}

.mosaic{display:grid;gap:16px 10px;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:768px){.home[data-fs="1"] .mosaic,.home[data-fs="1.5"] .mosaic{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}}
@media (min-width:1024px){.home[data-fs="2"] .mosaic{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}}
.mosaic img{transition:opacity .2s ease}
.mosaic button:hover img{opacity:.88}

@keyframes homeIn{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.hb{animation:none;transition:none}}
`
