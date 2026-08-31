import type { Config } from 'tailwindcss';

/**
 * Sistema visual KidCare — atelier infantil de alta gama.
 * Tokens únicos: usa siempre `bg-primary`, `text-ink`, `bg-canvas`,
 * `rounded-card`… Nunca colores sueltos de Tailwind en la UI.
 *
 * Los `accent-*` distinguen salas y niveles entre sí, no estados.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F3EEE6',
        surface: '#FFFCF7',
        ink: {
          DEFAULT: '#1F1A14',
          soft: '#5C5348',
          mute: '#8A8074',
        },
        primary: {
          DEFAULT: '#C45C3E',
          dark: '#9A3F28',
          light: '#E8C4B4',
        },
        sage: {
          DEFAULT: '#4A6B5C',
          light: '#D7E4DC',
        },
        gold: {
          DEFAULT: '#C4A46A',
          light: '#F0E6D0',
        },
        background: '#F3EEE6',
        secondary: '#C4A46A',
        accent: {
          pink: '#E8B4B8',
          green: '#A8C5B4',
          blue: '#A8C0D4',
          purple: '#C8B8D8',
        },
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31, 26, 20, 0.04), 0 10px 28px -16px rgba(31, 26, 20, 0.18)',
        lift: '0 16px 40px -18px rgba(196, 92, 62, 0.42)',
        pop: '0 8px 32px -10px rgba(31, 26, 20, 0.22)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        pop: 'pop 0.22s ease-out both',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
