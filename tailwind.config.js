/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
      colors: {
        // ── Cinematic dark base — charcoal / black-green / deep stone ──
        // Token names are kept stable so components read semantically:
        //   bone     = page / surface backgrounds (now dark)
        //   charcoal = primary text + ink (now off-white)
        //   stone    = borders, dividers, muted fills
        //   olive    = muted natural accent (badges, tags)
        //   coral / cardinal = Stanford cardinal red — identity accent
        bone: {
          DEFAULT: '#0d1110', // deep charcoal-green page background
          dark: '#161c1a',    // raised surface / tinted section
        },
        charcoal: {
          DEFAULT: '#f3f1ea', // primary text — warm off-white
          soft: '#c4c8c0',    // secondary text
          muted: '#8a918a',   // tertiary / captions — river gray
          light: '#5d655f',   // disabled / hints
        },
        stone: {
          DEFAULT: '#39413d',  // borders, dividers
          dark: '#4c554f',     // stronger borders
          light: '#1c2321',    // subtle dark fills (avatars, skeletons)
        },
        olive: {
          DEFAULT: '#9aa07e',  // muted olive accent
          soft: '#b3b894',     // lighter olive
          bg: '#1a201a',       // olive-tinted dark surface
        },
        taupe: {
          DEFAULT: '#8a7d6d',  // warm neutral
          soft: '#9e9384',     // lighter taupe
        },
        // Stanford cardinal — selective identity accent
        coral: {
          DEFAULT: '#c8202b',  // vivid cardinal for CTAs / rings
          dark: '#9e161f',     // hover / pressed
          soft: '#2a1315',     // dark red-tinted surface
        },
        surface: {
          DEFAULT: 'rgba(255,255,255,0.04)', // glass card fill
          solid: '#141a18',                  // opaque card when needed
        },
        // Backward-compat aliases
        background: '#0d1110',
        ink: {
          DEFAULT: '#f3f1ea',
          soft: '#c4c8c0',
          muted: '#8a918a',
          900: '#f7f6f1',
        },
        line: {
          DEFAULT: '#39413d',
          soft: '#262d2a',
        },
        cardinal: {
          DEFAULT: '#c8202b',
          dark: '#9e161f',
          soft: '#2a1315',
        },
        container: {
          low: '#111614',
          DEFAULT: '#161c1a',
          high: '#1f2624',
          highest: '#283029',
        },
        success: '#5fbf85',
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
        card: '0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)',
        'card-hover': '0 1px 0 rgba(255,255,255,0.05), 0 16px 44px rgba(0,0,0,0.5)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.4)',
        nav: '0 -1px 0 rgba(255,255,255,0.04)',
        story: '0 10px 40px rgba(0,0,0,0.5)',
        modal: '0 40px 90px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(200,32,43,0.4), 0 6px 24px rgba(200,32,43,0.25)',
      },
      maxWidth: {
        container: '1200px',
        feed: '552px',
      },
      borderRadius: {
        card: '20px',
        pill: '100px',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'sheet-up': 'sheetUp 0.34s cubic-bezier(0.16,1,0.3,1) both',
        'respect-pop': 'respectPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
        'story-in': 'storyIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        sheetUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
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
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
