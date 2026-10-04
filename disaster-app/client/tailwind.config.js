/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F2F5FA',
          100: '#E2E8F3',
          200: '#C3CEE4',
          300: '#94A6CA',
          400: '#5D73A3',
          500: '#3A4F7A',
          600: '#27385C',
          700: '#182845',
          800: '#101C33',
          900: '#0B1220',
          950: '#070B14'
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C'
        },
        safe: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857'
        },
        warn: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '18px',
        sheet: '24px'
      },
      boxShadow: {
        card: '0 2px 10px rgba(11, 18, 32, 0.07)',
        float: '0 10px 30px rgba(11, 18, 32, 0.16)',
        sheet: '0 -10px 30px rgba(11, 18, 32, 0.18)'
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.6)', opacity: '0.75' },
          '70%': { transform: 'scale(2.1)', opacity: '0' },
          '100%': { transform: 'scale(2.1)', opacity: '0' }
        },
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0 50%' }
        }
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'slide-up': 'slide-up 0.22s ease-out',
        'slide-down': 'slide-down 0.25s ease-out',
        shimmer: 'shimmer 1.4s ease infinite'
      }
    }
  },
  plugins: []
};
