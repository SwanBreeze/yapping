/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#080b14',
          800: '#0d1117',
          700: '#111827',
          600: '#1a2234',
          500: '#1f2d45',
          400: '#263352',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          glow: '#4f46e5',
        },
        cyan: {
          glow: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.3)',
        'cyan-glow': '0 0 15px rgba(34, 211, 238, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bounce-dots': 'bounceDots 1.2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceDots: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
