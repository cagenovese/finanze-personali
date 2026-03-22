/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-base':     '#0E0F13',
        'bg-surface':  '#14151A',
        'bg-elevated': '#1E2130',
        'bg-overlay':  '#252840',
        // Accent — Blue-Violet
        'accent-dim':    '#3A3F68',
        'accent-mid':    '#5B62A8',
        'accent-base':   '#7C85D0',
        'accent-bright': '#A8B0E8',
        // Semantic
        positive: '#4ADE80',
        negative: '#F87171',
        warning:  '#FBBF24',
        neutral:  '#5A5F70',
        // Text
        'text-primary':   '#F0F0F2',
        'text-secondary': '#A0A5B8',
        'text-muted':     '#5A5F70',
        'text-accent':    '#7C85D0',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:   '12px',
        btn:    '8px',
        chip:   '6px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-out',
      },
    },
  },
  plugins: [],
}
