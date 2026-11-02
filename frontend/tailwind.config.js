/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        finance: {
          bg:           'var(--t-bg)',
          surface:      'var(--t-surface)',
          card:         'var(--t-card)',
          elevated:     'var(--t-elevated)',
          border:       'var(--t-border)',
          muted:        'var(--t-muted)',
          text:         'var(--t-text)',
          'text-soft':  'var(--t-text-soft)',
          primary:      'var(--t-primary)',
          accent:       'var(--t-accent)',
          emerald:      'var(--t-primary)',
          emeraldDark:  'var(--t-primary-dark)',
          sky:          'var(--t-secondary)',
          rose:         'var(--t-danger)',
          amber:        'var(--t-accent)',
          purple:       'var(--t-accent)',
          // Chart colors
          chart1:       'var(--t-chart-1)',
          chart2:       'var(--t-chart-2)',
          chart3:       'var(--t-chart-3)',
          chart4:       'var(--t-chart-4)',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        num: ['"DM Sans"', 'Inter', 'sans-serif'],
        mono: ['"DM Sans"', 'monospace'],
      },
      boxShadow: {
        'wealth': '0 2px 8px -1px var(--t-shadow), 0 1px 3px -1px var(--t-shadow)',
        'wealth-hover': '0 8px 24px -4px var(--t-shadow), 0 2px 6px -2px var(--t-shadow)',
      }
    },
  },
  plugins: [],
}
