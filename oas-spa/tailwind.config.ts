import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#F4F6FA',
          100: '#E8EDF5',
          200: '#C7D2E8',
          300: '#9AADD0',
          400: '#6A86B8',
          500: '#3D619F',
          600: '#2B4B85',
          700: '#1B2B4B',
          800: '#12203A',
          900: '#0A1526',
        },
        gold: {
          DEFAULT: '#C9A96E',
          50:  '#FBF8F0',
          100: '#F5ECCC',
          200: '#EAD49E',
          300: '#D9BE7A',
          400: '#B8903A',
          500: '#A07520',
        },
        cream: {
          DEFAULT: '#EDE9E0',
          100: '#E8E4DA',
          200: '#DDD8CD',
          300: '#D4CFCA',
        },
        success: { DEFAULT: '#3B8C6E' },
        danger:  { DEFAULT: '#C25B56' },
        info:    { DEFAULT: '#5B7FA6' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        heading: ['"Shippori Mincho"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(27,43,75,0.04)',
        card:   '0 1px 3px rgba(27,43,75,0.04), 0 4px 12px rgba(27,43,75,0.02)',
        float:  '0 4px 16px rgba(27,43,75,0.06), 0 1px 3px rgba(27,43,75,0.04)',
        modal:  '0 8px 32px rgba(27,43,75,0.10), 0 2px 8px rgba(27,43,75,0.04)',
      },
      animation: {
        'fade-in-up':  'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':    'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down':  'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in':    'toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-out':   'toastOut 0.3s ease-in both',
        'gold-pulse':  'goldPulse 2.4s ease-in-out infinite',
        'shimmer-gold':'shimmerGold 3s ease-in-out infinite',
        'check-draw':  'checkDraw 0.6s cubic-bezier(0.65, 0, 0.35, 1) 0.2s both',
        'stagger-1':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both',
        'stagger-2':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both',
        'stagger-3':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both',
        'stagger-4':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        toastOut: {
          '0%':   { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        goldPulse: {
          '0%, 100%': { borderColor: '#C9A96E', opacity: '1' },
          '50%':      { borderColor: '#C9A96E', opacity: '0.5' },
        },
        shimmerGold: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        checkDraw: {
          '0%':   { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
