/** inline px font-size를 글자 크기 설정(--font-scale)에 연동시키는 헬퍼. */
export const fs = (px: number): string => `calc(${px}px * var(--font-scale, 1))`
