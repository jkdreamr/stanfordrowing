/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cardinal Row — premium athletic tech (Stitch design system)
        background: '#f8f9fa', // cool off-white app background
        surface: '#ffffff', // cards / raised surfaces
        ink: {
          DEFAULT: '#191c1d', // primary text / on-surface
          soft: '#5f5e5e', // secondary text
          muted: '#8a8786', // tertiary / captions
          900: '#131315', // near-black surfaces
        },
        line: {
          DEFAULT: '#e9ecef', // hairline border
          soft: '#f1f3f5',
        },
        cardinal: {
          DEFAULT: '#b51c00', // primary cardinal red
          dark: '#8e1300',
          soft: '#ffe7e2', // tint surface
        },
        coral: {
          DEFAULT: '#ff4b2b', // vibrant accent / highlights
          soft: '#fff1ee',
        },
        container: {
          low: '#f3f4f5',
          DEFAULT: '#edeeef',
          high: '#e7e8e9',
          highest: '#e1e3e4',
        },
        success: '#1c85e8',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        card: '0 4px 24px -2px rgba(0,0,0,0.04)',
        'card-lg': '0 20px 50px rgba(0,0,0,0.05)',
        cardinal: '0 16px 40px rgba(181,28,0,0.18)',
        nav: '0 -10px 40px rgba(0,0,0,0.03)',
      },
      maxWidth: {
        container: '1280px',
        feed: '600px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'respect-pop': 'respectPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        respectPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
