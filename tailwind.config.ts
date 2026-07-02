import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#effaf4',
          100: '#d6f5e3',
          200: '#a5e9c2',
          500: '#0eaa51',
          600: '#008037',
          700: '#00612a',
        },
        surface: {
          0: '#f8f7f4',
          1: '#f0efe9',
          2: '#ffffff',
        },
        ink: {
          primary:   '#0f0f0e',
          secondary: '#4a4945',
          muted:     '#8a8880',
        },
        success: '#15803d',
        danger:  '#dc2626',
        warning: '#d97706',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '12px',
      },
    },
  },
  plugins: [],
}
export default config
