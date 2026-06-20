import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#b9deff',
          300: '#86c8ff',
          400: '#4ba9ff',
          500: '#2090ed',
          600: '#1470cb', // primary Telegram-blue
          700: '#1259a3',
          800: '#144c85',
          900: '#15406e',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0e1621',
          panel: '#f4f4f5',
          panelDark: '#17212b',
          sidebar: '#ffffff',
          sidebarDark: '#17212b',
          bubbleOut: '#effdde',
          bubbleOutDark: '#2b5278',
          bubbleIn: '#ffffff',
          bubbleInDark: '#182533',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'system-ui',
          'sans-serif',
        ],
      },
      keyframes: {
        'message-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'message-in': 'message-in 0.18s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
