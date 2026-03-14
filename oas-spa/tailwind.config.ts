import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lien: {
          50:  '#F7F5F3',
          100: '#EDE8E3',
          200: '#DDD5CC',
          300: '#C4B8AB',
          400: '#A89888',
          500: '#8B7B6B',
          600: '#735763',
          700: '#5A3F4E',
          800: '#3D2B36',
          900: '#1A1118',
        },
        accent: {
          DEFAULT: '#F79321',
          dark:    '#D97B10',
          light:   '#FFAD4D',
          50:      '#FFF8EE',
          100:     '#FFEFD4',
          200:     '#FFDDA8',
          300:     '#FFC573',
          400:     '#FFAD4D',
          500:     '#F79321',
          600:     '#D97B10',
          700:     '#B3620A',
          800:     '#8C4C08',
          900:     '#663705',
        },
        matsu: {
          DEFAULT: '#4CAF50',
          light:   '#81C784',
          dark:    '#388E3C',
        },
        danger: {
          DEFAULT: '#E05252',
          light:   '#EF7A7A',
          dark:    '#C62828',
        },
      },
      fontFamily: {
        heading: ['"Zen Kaku Gothic New"', 'sans-serif'],
        body:    ['"Zen Maru Gothic"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'fade-in-up':  'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':    'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down':  'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in':    'toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-out':   'toastOut 0.3s ease-in both',
        'float':       'float 3s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'check-pop':   'checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
        'stagger-1':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both',
        'stagger-2':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'stagger-3':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
        'stagger-4':   'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        checkPop: {
          '0%':   { opacity: '0', transform: 'scale(0)' },
          '60%':  { transform: 'scale(1.15)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
      },
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke',
      },
      transitionDuration: {
        'theme': '300ms',
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, #F7F5F3 0%, #EDE8E3 50%, #F7F5F3 100%)',
        'gradient-warm-dark': 'linear-gradient(135deg, #1A1118 0%, #3D2B36 50%, #1A1118 100%)',
        'gradient-accent': 'linear-gradient(135deg, #F79321 0%, #FFAD4D 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
