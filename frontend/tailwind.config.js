/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        automotive: {
          canvas: {
            light: '#F8FAFC',
            dark: '#0B0F19',
          },
          surface: {
            light: '#FFFFFF',
            dark: '#111827',
          },
          surfaceElevated: {
            light: '#FFFFFF',
            dark: '#1E293B',
          },
          border: {
            light: '#E2E8F0',
            dark: '#1E293B',
          },
          borderSubtle: {
            light: '#F1F5F9',
            dark: '#141D2E',
          },
          cyan: '#00D2FF',
          electric: '#0284C7',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 12px -2px rgba(2, 132, 199, 0.25)',
        'glow-md': '0 0 20px -3px rgba(2, 132, 199, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(0, 210, 255, 0.35)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}

