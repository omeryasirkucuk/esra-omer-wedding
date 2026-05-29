/** @type {import('tailwindcss').Config} */
// Colours are wired to CSS variables defined in src/theme/tokens.css.
// Swapping the whole palette later means editing only that one file.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        ink: 'var(--c-ink)',
        primary: 'var(--c-primary)',
        'primary-soft': 'var(--c-primary-soft)',
        gold: 'var(--c-gold)',
        sage: 'var(--c-sage)',
        rose: 'var(--c-rose)',
        muted: 'var(--c-muted)',
        line: 'var(--c-line)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Pinyon Script"', 'cursive'],
        sans: ['Jost', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.3em',
      },
      keyframes: {
        bob: {
          '0%,100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(6px)', opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        bob: 'bob 1.8s ease-in-out infinite',
        fadeUp: 'fadeUp 0.7s ease both',
      },
    },
  },
  plugins: [],
}
