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
    },
  },
  plugins: [],
}
