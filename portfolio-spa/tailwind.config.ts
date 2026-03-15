import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FCF0DE',
          deep: '#F5E8D0',
        },
        brown: {
          50: '#FCF0DE',
          100: '#F5E8D0',
          200: '#EDE3D8',
          300: '#C4A99B',
          400: '#A07888',
          500: '#8B7355',
          600: '#735763',
          700: '#5A4250',
          800: '#3D2B1F',
          900: '#2A1A12',
          950: '#1A1210',
        },
        accent: {
          DEFAULT: '#F79321',
          light: '#FFA94D',
          dark: '#E07800',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Zen Kaku Gothic New"', '"Hiragino Kaku Gothic ProN"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
