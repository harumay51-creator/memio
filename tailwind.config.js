/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        'yuri': {
          50:  '#f7f7f8',
          100: '#eeeff1',
          200: '#d9dbe0',
          300: '#b8bcc5',
          400: '#9097a5',
          500: '#717888',
          600: '#5b6070',
          700: '#4b4f5d',
          800: '#40434e',
          900: '#383a43',
          950: '#25272e',
        },
        'accent': {
          DEFAULT: '#6366f1',
          light:   '#818cf8',
          dark:    '#4f46e5',
        },
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08)',
        'float':      '0 8px 32px 0 rgba(0,0,0,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)',
      },
      keyframes: {
        captureToast: {
          '0%':   { opacity: '0', transform: 'translate(-50%, 10px)' },
          '12%':  { opacity: '1', transform: 'translate(-50%, 0)' },
          '80%':  { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -4px)' },
        },
      },
      animation: {
        captureToast: 'captureToast 2.2s ease forwards',
      },
    },
  },
  plugins: [],
}
