/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Muted luxury palette — stone / fog / river / morning light
        bone: {
          DEFAULT: '#f5f2ed',  // warm off-white background
          dark: '#ebe7e0',     // slightly deeper for sections
        },
        charcoal: {
          DEFAULT: '#2c2c2c',  // primary text
          soft: '#5a5651',     // secondary text
          muted: '#8c8680',    // tertiary / captions
          light: '#b0aaa3',    // disabled / hints
        },
        stone: {
          DEFAULT: '#d4cfc8',  // borders, dividers
          dark: '#a8a299',     // stronger borders
          light: '#e8e4de',    // subtle backgrounds
        },
        olive: {
          DEFAULT: '#7a7a65',  // muted olive accent
          soft: '#9a9a85',     // lighter olive
          bg: '#f0efe8',       // olive-tinted surface
        },
        taupe: {
          DEFAULT: '#c4b5a5',  // warm neutral
          soft: '#d9cfc3',     // lighter taupe
        },
        coral: {
          DEFAULT: '#c4704a',  // restrained orange/coral — primary actions only
          dark: '#a85c3a',     // hover state
          soft: '#f5ebe5',     // tinted surface
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.65)',  // frosted card
          solid: '#ffffff',                    // opaque card when needed
        },
        // Keep some aliases for backward compat during migration
        background: '#f5f2ed',
        ink: {
          DEFAULT: '#2c2c2c',
          soft: '#5a5651',
          muted: '#8c8680',
          900: '#1a1a1a',
        },
        line: {
          DEFAULT: '#d4cfc8',
          soft: '#e8e4de',
        },
        cardinal: {
          DEFAULT: '#c4704a',
          dark: '#a85c3a',
          soft: '#f5ebe5',
        },
        container: {
          low: '#ebe7e0',
          DEFAULT: '#e8e4de',
          high: '#d4cfc8',
          highest: '#c4bfb8',
        },
        success: '#5a8f6a',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        editorial: '-0.025em',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.06)',
        glass: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.5)',
        nav: '0 -1px 0 rgba(0,0,0,0.04)',
        story: '0 4px 20px rgba(0,0,0,0.08)',
        modal: '0 25px 60px rgba(0,0,0,0.15)',
      },
      maxWidth: {
        container: '1280px',
        feed: '540px',
      },
      borderRadius: {
        card: '16px',
        pill: '100px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'respect-pop': 'respectPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
        'story-in': 'storyIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        respectPop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        storyIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
