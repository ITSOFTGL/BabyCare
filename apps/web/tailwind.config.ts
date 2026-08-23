import type { Config } from 'tailwindcss';

/**
 * Paleta unica de KidCare. Usa siempre estos tokens (`bg-primary`, `text-ink`,
 * `bg-background`, `rounded-card`...) en lugar de colores sueltos de Tailwind,
 * para que toda la app se vea consistente.
 *
 * Los colores `accent-*` son SOLO para distinguir salas y niveles entre si,
 * nunca como paleta general de la interfaz.
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
        primary: {
          DEFAULT: '#F97316',
          dark: '#EA580C',
        },
        secondary: '#FBBF24',
        background: '#FFFBEB',
        ink: '#1E293B',
        accent: {
          pink: '#FB7185',
          green: '#34D399',
          blue: '#60A5FA',
          purple: '#A78BFA',
        },
      },
      borderRadius: {
        card: '24px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(30, 41, 59, 0.18)',
        lift: '0 18px 40px -16px rgba(249, 115, 22, 0.45)',
      },
      fontFamily: {
        sans: ['var(--font-quicksand)', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        pop: 'pop 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
