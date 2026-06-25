/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Selah Design System
        primary: {
          50:  '#EEF4EF',
          100: '#D9EBD9',
          200: '#B8D9B8',
          500: '#4E8B55',
          700: '#3D6B44',
          800: '#2D5233',
          900: '#1D3520',
        },
        accent: {
          100: '#F5EBD0',
          300: '#E8CC7A',
          500: '#CA9830',
          700: '#9B7020',
        },
        surface: {
          0: '#F9F7F2',
          1: '#F2EFE8',
          2: '#E8E4DA',
          3: '#DDD8CC',
        },
        ink: {
          0: '#2B2520',
          1: '#5A534C',
          2: '#8C8580',
          3: '#C0BBB4',
        },
        divider: '#E4E0D8',
        selah: {
          error: '#B85450',
          'tag-green': '#2D6A4F',
          'tag-brown': '#6B4E2D',
        },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Noto Sans KR', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
      // 글자 크기(--font-scale) 연동: font-size/line-height에 calc(... * var(--font-scale,1)).
      // theme.extend.fontSize로 정의해야 Tailwind가 fontSize 네이티브 위치(leading-* 앞)에
      // 방출 → 명시적 leading-* 가 cascade에서 이기고, scale=1에서 픽셀 동일(시각 회귀 0).
      // var 기본값 1 → <main> 밖 크롬은 상속 안 받아 자동 1 유지.
      fontSize: {
        xs:   ['calc(0.75rem * var(--font-scale, 1))',  'calc(1rem * var(--font-scale, 1))'],
        sm:   ['calc(0.875rem * var(--font-scale, 1))', 'calc(1.25rem * var(--font-scale, 1))'],
        base: ['calc(1rem * var(--font-scale, 1))',     'calc(1.5rem * var(--font-scale, 1))'],
        lg:   ['calc(1.125rem * var(--font-scale, 1))', 'calc(1.75rem * var(--font-scale, 1))'],
        xl:   ['calc(1.25rem * var(--font-scale, 1))',  'calc(1.75rem * var(--font-scale, 1))'],
        '2xl':['calc(1.5rem * var(--font-scale, 1))',   'calc(2rem * var(--font-scale, 1))'],
      },
    },
  },
  plugins: [],
}
